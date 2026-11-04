package config

import (
	"encoding/base64"
	"strings"
	"testing"
	"time"
)

func validConfig() Config {
	return Config{
		Environment:             "test",
		HTTPAddress:             ":8080",
		JWTSigningKey:           []byte("0123456789abcdef0123456789abcdef"),
		RedisURL:                "redis://localhost:6379/0",
		DatabaseURL:             "postgres://user:pass@localhost:5432/app?sslmode=disable",
		AllowedOrigins:          []string{"http://localhost:4200"},
		ReadTimeout:             10 * time.Second,
		WriteTimeout:            15 * time.Second,
		IdleTimeout:             time.Minute,
		ShutdownTimeout:         10 * time.Second,
		DatabaseMaxConnections:  20,
		DatabaseMinConnections:  2,
		DatabaseMaxConnLifetime: time.Hour,
	}
}

func TestConfigValidateRequiresRedisURL(t *testing.T) {
	cfg := validConfig()
	cfg.RedisURL = "http://localhost:6379"
	if err := cfg.Validate(); err == nil || !strings.Contains(err.Error(), "REDIS_URL") {
		t.Fatalf("expected REDIS_URL validation error, got %v", err)
	}
}

func TestConfigValidateRequiresSecureRedisInProduction(t *testing.T) {
	cfg := validConfig()
	cfg.Environment = "production"
	cfg.RedisURL = "redis://localhost:6379/0"
	if err := cfg.Validate(); err == nil || !strings.Contains(err.Error(), "REDIS_URL") {
		t.Fatalf("expected production Redis security validation error, got %v", err)
	}

	cfg.RedisURL = "rediss://:secret@redis.example:6379/0"
	cfg.DatabaseURL = strings.Replace(cfg.DatabaseURL, "sslmode=disable", "sslmode=verify-full", 1)
	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected secure production Redis URL, got %v", err)
	}
}

func TestConfigValidateJWTRequiresStrongSigningKey(t *testing.T) {
	cfg := validConfig()
	cfg.JWTSigningKey = []byte("too-short")
	if err := cfg.ValidateJWT(); err == nil {
		t.Fatal("expected short JWT signing key to be rejected")
	}

	cfg.JWTSigningKey = []byte("0123456789abcdef0123456789abcdef")
	if err := cfg.ValidateJWT(); err != nil {
		t.Fatalf("expected valid JWT signing key, got %v", err)
	}
}

func TestLoadDecodesJWTSigningKey(t *testing.T) {
	t.Setenv("APP_ENV", "test")
	t.Setenv("DATABASE_URL", "postgres://localhost:5432/app?sslmode=disable")
	t.Setenv("JWT_SIGNING_KEY", base64.StdEncoding.EncodeToString([]byte("0123456789abcdef0123456789abcdef")))
	t.Setenv("CORS_ALLOWED_ORIGINS", "http://localhost:4200")

	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if err := cfg.ValidateJWT(); err != nil {
		t.Fatalf("expected decoded JWT key to be valid, got %v", err)
	}
}

func TestConfigValidateRequiresDatabaseURL(t *testing.T) {
	cfg := validConfig()
	cfg.DatabaseURL = ""

	err := cfg.Validate()
	if err == nil || !strings.Contains(err.Error(), "DATABASE_URL") {
		t.Fatalf("expected DATABASE_URL validation error, got %v", err)
	}
}

func TestConfigValidateRejectsWildcardCORS(t *testing.T) {
	cfg := validConfig()
	cfg.AllowedOrigins = []string{"*"}

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected wildcard CORS origin to be rejected")
	}
}

func TestConfigValidateRejectsDisabledDatabaseTLSInProduction(t *testing.T) {
	cfg := validConfig()
	cfg.Environment = "production"
	cfg.RedisURL = "rediss://:secret@redis.example:6379/0"

	err := cfg.Validate()
	if err == nil || !strings.Contains(err.Error(), "TLS") {
		t.Fatalf("expected production TLS validation error, got %v", err)
	}
}

func TestConfigValidateAcceptsProductionTLS(t *testing.T) {
	cfg := validConfig()
	cfg.Environment = "production"
	cfg.RedisURL = "rediss://:secret@redis.example:6379/0"
	cfg.DatabaseURL = "postgres://user:pass@db.example/app?sslmode=verify-full"

	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected valid production configuration, got %v", err)
	}
}
