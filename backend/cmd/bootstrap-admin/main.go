package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/mail"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rpambo/protocol-segurity/backend/internal/config"
	"github.com/rpambo/protocol-segurity/backend/internal/identity"
	"github.com/rpambo/protocol-segurity/backend/internal/platform/database"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("invalid application configuration", "error", err)
		os.Exit(1)
	}

	email := strings.ToLower(strings.TrimSpace(os.Getenv("BOOTSTRAP_ADMIN_EMAIL")))
	name := strings.TrimSpace(os.Getenv("BOOTSTRAP_ADMIN_NAME"))
	password := os.Getenv("BOOTSTRAP_ADMIN_PASSWORD")
	parsedEmail, emailErr := mail.ParseAddress(email)
	if emailErr != nil || parsedEmail.Address != email || name == "" || password == "" {
		slog.Error("BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME, and BOOTSTRAP_ADMIN_PASSWORD are required and must be valid")
		os.Exit(1)
	}
	if strings.TrimSpace(password) != password {
		slog.Error("bootstrap password must not begin or end with whitespace")
		os.Exit(1)
	}
	passwordHash, err := identity.HashPassword(password)
	if err != nil {
		slog.Error("invalid bootstrap password", "error", err)
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	pool, err := database.Open(ctx, cfg)
	if err != nil {
		slog.Error("database connection failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := createFirstGlobalAdmin(ctx, pool, email, name, passwordHash); err != nil {
		slog.Error("bootstrap Global Admin creation failed", "error", err)
		os.Exit(1)
	}
	slog.Info("initial Global Admin created", "email", email)
}

func createFirstGlobalAdmin(ctx context.Context, pool *pgxpool.Pool, email, name, passwordHash string) error {
	tx, err := pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
	if err != nil {
		return fmt.Errorf("begin bootstrap transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	var accountsExist bool
	if err := tx.QueryRow(ctx, "SELECT EXISTS (SELECT 1 FROM accounts WHERE deleted_at IS NULL)").Scan(&accountsExist); err != nil {
		return fmt.Errorf("check existing accounts: %w", err)
	}
	if accountsExist {
		return errors.New("bootstrap is only allowed before the first account exists")
	}

	accountID := uuid.New()
	if _, err := tx.Exec(ctx, `
		INSERT INTO accounts (id, email, email_normalized, display_name, status, email_verified_at)
		VALUES ($1, $2, $3, $4, 'active', now())
	`, accountID, email, email, name); err != nil {
		return fmt.Errorf("create initial account: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO account_credentials (account_id, password_hash) VALUES ($1, $2)
	`, accountID, passwordHash); err != nil {
		return fmt.Errorf("create initial credentials: %w", err)
	}
	tag, err := tx.Exec(ctx, `
		INSERT INTO account_roles (account_id, role_id)
		SELECT $1, id FROM roles WHERE code = 'global_admin'
	`, accountID)
	if err != nil {
		return fmt.Errorf("assign initial Global Admin role: %w", err)
	}
	if tag.RowsAffected() != 1 {
		return errors.New("required global_admin role is missing")
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO account_scope_assignments (id, account_id, scope_type)
		VALUES ($1, $2, 'global')
	`, uuid.New(), accountID); err != nil {
		return fmt.Errorf("assign global organizational scope: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO audit_events (id, actor_account_id, action, resource_type, resource_id, result, request_id)
		VALUES ($1, $2, 'account.bootstrap', 'account', $2, 'success', 'bootstrap-admin')
	`, uuid.New(), accountID); err != nil {
		return fmt.Errorf("record initial account audit event: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit bootstrap transaction: %w", err)
	}
	return nil
}
