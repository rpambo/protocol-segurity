package migrations

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed sql/*.sql
var migrationFiles embed.FS

type migration struct {
	name string
	sql  string
}

func Up(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version text PRIMARY KEY,
			applied_at timestamptz NOT NULL DEFAULT now()
		)
	`); err != nil {
		return fmt.Errorf("create schema migration table: %w", err)
	}

	migrations, err := load()
	if err != nil {
		return err
	}
	for _, item := range migrations {
		if err := apply(ctx, pool, item); err != nil {
			return err
		}
	}
	return nil
}

func load() ([]migration, error) {
	entries, err := fs.ReadDir(migrationFiles, "sql")
	if err != nil {
		return nil, fmt.Errorf("read embedded migrations: %w", err)
	}
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	result := make([]migration, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".up.sql") {
			continue
		}
		body, err := migrationFiles.ReadFile("sql/" + entry.Name())
		if err != nil {
			return nil, fmt.Errorf("read migration %q: %w", entry.Name(), err)
		}
		result = append(result, migration{
			name: strings.TrimSuffix(entry.Name(), ".up.sql"),
			sql:  string(body),
		})
	}
	return result, nil
}

func apply(ctx context.Context, pool *pgxpool.Pool, item migration) error {
	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin migration %q: %w", item.name, err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	var alreadyApplied bool
	if err := tx.QueryRow(ctx, "SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1)", item.name).Scan(&alreadyApplied); err != nil {
		return fmt.Errorf("check migration %q: %w", item.name, err)
	}
	if alreadyApplied {
		return nil
	}
	if _, err := tx.Exec(ctx, item.sql); err != nil {
		return fmt.Errorf("execute migration %q: %w", item.name, err)
	}
	if _, err := tx.Exec(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", item.name); err != nil {
		return fmt.Errorf("record migration %q: %w", item.name, err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit migration %q: %w", item.name, err)
	}
	return nil
}
