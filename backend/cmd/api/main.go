package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rpambo/protocol-segurity/backend/internal/config"
	"github.com/rpambo/protocol-segurity/backend/internal/httpapi"
	"github.com/rpambo/protocol-segurity/backend/internal/identity"
	"github.com/rpambo/protocol-segurity/backend/internal/platform/database"
	"github.com/rpambo/protocol-segurity/backend/internal/platform/redisstore"
)

type dependencyProber struct {
	database interface{ Ping(context.Context) error }
	redis    interface{ Ping(context.Context) error }
}

func (p dependencyProber) Ping(ctx context.Context) error {
	if err := p.database.Ping(ctx); err != nil {
		return err
	}
	return p.redis.Ping(ctx)
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("invalid application configuration", "error", err)
		os.Exit(1)
	}
	if err := cfg.ValidateJWT(); err != nil {
		slog.Error("invalid JWT configuration", "error", err)
		os.Exit(1)
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	startupCtx, cancelStartup := context.WithTimeout(context.Background(), 10*time.Second)
	pool, err := database.Open(startupCtx, cfg)
	if err != nil {
		cancelStartup()
		logger.Error("database connection failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	redisClient, err := redisstore.Open(startupCtx, cfg.RedisURL)
	cancelStartup()
	if err != nil {
		logger.Error("Redis connection failed", "error", err)
		os.Exit(1)
	}
	defer func() {
		if err := redisClient.Close(); err != nil {
			logger.Error("Redis close failed", "error", err)
		}
	}()

	handler := httpapi.NewServer(httpapi.ServerConfig{
		Environment:      cfg.Environment,
		AllowedOrigins:   cfg.AllowedOrigins,
		ReadinessProber:  dependencyProber{database: pool, redis: redisClient},
		LoginRateLimiter: redisClient,
		Identity:         identity.NewService(pool, cfg.JWTSigningKey),
		CookieSecure:     cfg.Environment == "production" || cfg.Environment == "staging",
		Logger:           logger,
	}).Handler()

	server := &http.Server{
		Addr:              cfg.HTTPAddress,
		Handler:           handler,
		ReadHeaderTimeout: cfg.ReadTimeout,
		ReadTimeout:       cfg.ReadTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		IdleTimeout:       cfg.IdleTimeout,
	}

	serverErrors := make(chan error, 1)
	go func() {
		logger.Info("HTTP server starting", "address", cfg.HTTPAddress, "environment", cfg.Environment)
		serverErrors <- server.ListenAndServe()
	}()

	shutdownCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	select {
	case err := <-serverErrors:
		if !errors.Is(err, http.ErrServerClosed) {
			logger.Error("HTTP server stopped unexpectedly", "error", err)
			os.Exit(1)
		}
	case <-shutdownCtx.Done():
		ctx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
		defer cancel()
		if err := server.Shutdown(ctx); err != nil {
			logger.Error("graceful shutdown failed", "error", err)
			_ = server.Close()
			os.Exit(1)
		}
		logger.Info("HTTP server stopped")
	}
}
