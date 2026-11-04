package config

import (
	"encoding/base64"
	"errors"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Environment             string
	HTTPAddress             string
	DatabaseURL             string
	RedisURL                string
	JWTSigningKey           []byte
	AllowedOrigins          []string
	ReadTimeout             time.Duration
	WriteTimeout            time.Duration
	IdleTimeout             time.Duration
	ShutdownTimeout         time.Duration
	DatabaseMaxConnections  int32
	DatabaseMinConnections  int32
	DatabaseMaxConnLifetime time.Duration
}

func Load() (Config, error) {
	var err error
	cfg := Config{
		Environment:             envOrDefault("APP_ENV", "development"),
		HTTPAddress:             envOrDefault("HTTP_ADDR", ":8080"),
		DatabaseURL:             strings.TrimSpace(os.Getenv("DATABASE_URL")),
		RedisURL:                strings.TrimSpace(envOrDefault("REDIS_URL", "redis://localhost:6379/0")),
		AllowedOrigins:          splitCSV(envOrDefault("CORS_ALLOWED_ORIGINS", "http://localhost:4200")),
		ReadTimeout:             10 * time.Second,
		WriteTimeout:            15 * time.Second,
		IdleTimeout:             60 * time.Second,
		ShutdownTimeout:         10 * time.Second,
		DatabaseMaxConnections:  20,
		DatabaseMinConnections:  2,
		DatabaseMaxConnLifetime: time.Hour,
	}
	if encodedKey := strings.TrimSpace(os.Getenv("JWT_SIGNING_KEY")); encodedKey != "" {
		cfg.JWTSigningKey, err = base64.StdEncoding.DecodeString(encodedKey)
		if err != nil {
			return Config{}, errors.New("JWT_SIGNING_KEY must be valid base64")
		}
	}

	if cfg.ReadTimeout, err = durationOrDefault("HTTP_READ_TIMEOUT", cfg.ReadTimeout); err != nil {
		return Config{}, err
	}
	if cfg.WriteTimeout, err = durationOrDefault("HTTP_WRITE_TIMEOUT", cfg.WriteTimeout); err != nil {
		return Config{}, err
	}
	if cfg.IdleTimeout, err = durationOrDefault("HTTP_IDLE_TIMEOUT", cfg.IdleTimeout); err != nil {
		return Config{}, err
	}
	if cfg.ShutdownTimeout, err = durationOrDefault("HTTP_SHUTDOWN_TIMEOUT", cfg.ShutdownTimeout); err != nil {
		return Config{}, err
	}
	if cfg.DatabaseMaxConnLifetime, err = durationOrDefault("DATABASE_MAX_CONNECTION_LIFETIME", cfg.DatabaseMaxConnLifetime); err != nil {
		return Config{}, err
	}
	if cfg.DatabaseMaxConnections, err = int32OrDefault("DATABASE_MAX_CONNECTIONS", cfg.DatabaseMaxConnections); err != nil {
		return Config{}, err
	}
	if cfg.DatabaseMinConnections, err = int32OrDefault("DATABASE_MIN_CONNECTIONS", cfg.DatabaseMinConnections); err != nil {
		return Config{}, err
	}
	if err := cfg.Validate(); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

func (c Config) ValidateJWT() error {
	if len(c.JWTSigningKey) < 32 {
		return errors.New("JWT_SIGNING_KEY must contain at least 32 bytes encoded as base64")
	}
	return nil
}

func (c Config) Validate() error {
	if c.Environment != "development" && c.Environment != "test" && c.Environment != "staging" && c.Environment != "production" {
		return errors.New("APP_ENV must be development, test, staging, or production")
	}
	if strings.TrimSpace(c.HTTPAddress) == "" {
		return errors.New("HTTP_ADDR must not be empty")
	}
	if c.DatabaseURL == "" {
		return errors.New("DATABASE_URL is required")
	}
	redisURL, err := url.Parse(c.RedisURL)
	if err != nil || (redisURL.Scheme != "redis" && redisURL.Scheme != "rediss") || redisURL.Hostname() == "" {
		return errors.New("REDIS_URL must be a valid redis:// or rediss:// URL")
	}
	if c.Environment == "production" {
		password, hasPassword := "", false
		if redisURL.User != nil {
			password, hasPassword = redisURL.User.Password()
		}
		if !hasPassword || password == "" || redisURL.Scheme != "rediss" {
			return errors.New("production REDIS_URL must use rediss:// with a password")
		}
	}
	if c.Environment == "production" && strings.Contains(c.DatabaseURL, "sslmode=disable") {
		return errors.New("DATABASE_URL must not disable TLS in production")
	}
	if len(c.AllowedOrigins) == 0 {
		return errors.New("CORS_ALLOWED_ORIGINS must contain at least one origin")
	}
	for _, origin := range c.AllowedOrigins {
		if origin == "*" {
			return errors.New("wildcard CORS origins are not allowed")
		}
	}
	if c.ReadTimeout <= 0 || c.WriteTimeout <= 0 || c.IdleTimeout <= 0 || c.ShutdownTimeout <= 0 || c.DatabaseMaxConnLifetime <= 0 {
		return errors.New("timeouts and database connection lifetime must be positive")
	}
	if c.DatabaseMaxConnections <= 0 || c.DatabaseMinConnections < 0 || c.DatabaseMinConnections > c.DatabaseMaxConnections {
		return errors.New("database connection pool limits are invalid")
	}
	return nil
}

func envOrDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func splitCSV(value string) []string {
	items := strings.Split(value, ",")
	result := make([]string, 0, len(items))
	for _, item := range items {
		if origin := strings.TrimSpace(item); origin != "" {
			result = append(result, origin)
		}
	}
	return result
}

func durationOrDefault(key string, fallback time.Duration) (time.Duration, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback, nil
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return 0, fmt.Errorf("%s must be a valid duration: %w", key, err)
	}
	return parsed, nil
}

func int32OrDefault(key string, fallback int32) (int32, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback, nil
	}
	parsed, err := strconv.ParseInt(value, 10, 32)
	if err != nil {
		return 0, fmt.Errorf("%s must be a 32-bit integer: %w", key, err)
	}
	return int32(parsed), nil
}
