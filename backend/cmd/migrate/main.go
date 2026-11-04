package main

import (
	"context"
	"log/slog"
	"os"
	"time"

	"github.com/rpambo/protocol-segurity/backend/internal/config"
	"github.com/rpambo/protocol-segurity/backend/internal/platform/database"
	"github.com/rpambo/protocol-segurity/backend/internal/platform/migrations"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("invalid application configuration", "error", err)
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool, err := database.Open(ctx, cfg)
	if err != nil {
		slog.Error("database connection failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := migrations.Up(ctx, pool); err != nil {
		slog.Error("database migration failed", "error", err)
		os.Exit(1)
	}
	slog.Info("database migrations applied")
}
