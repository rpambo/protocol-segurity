package identity

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrAccountUnavailable = errors.New("account is unavailable")
	ErrSessionInvalid     = errors.New("session is invalid or expired")
	ErrCSRFInvalid        = errors.New("CSRF token is invalid")
)

const (
	accessTokenLifetime  = 15 * time.Minute
	refreshTokenLifetime = 30 * 24 * time.Hour
	jwtIssuer            = "spirit-embassy-api"
	jwtAudience          = "spirit-embassy-web"
)

var dummyPasswordHash = "$argon2id$v=19$m=65536,t=3,p=2$" +
	"AAAAAAAAAAAAAAAAAAAAAA$" +
	"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"

type Account struct {
	ID                uuid.UUID `json:"id"`
	Email             string    `json:"email"`
	DisplayName       string    `json:"displayName"`
	Status            string    `json:"status"`
	PreferredLanguage string    `json:"preferredLanguage"`
	Timezone          string    `json:"timezone"`
	Roles             []string  `json:"roles"`
	Assignments       []Scope   `json:"assignments"`
}

type Scope struct {
	Type      string     `json:"type"`
	CountryID *uuid.UUID `json:"countryId,omitempty"`
	RegionID  *uuid.UUID `json:"regionId,omitempty"`
	BranchID  *uuid.UUID `json:"branchId,omitempty"`
}

type Session struct {
	ID               uuid.UUID
	Account          Account
	ExpiresAt        time.Time
	RefreshExpiresAt time.Time
}

type Service struct {
	pool       *pgxpool.Pool
	signingKey []byte
	now        func() time.Time
}

type accessClaims struct {
	SessionID string `json:"sid"`
	jwt.RegisteredClaims
}

func NewService(pool *pgxpool.Pool, signingKey []byte) *Service {
	return &Service{pool: pool, signingKey: append([]byte(nil), signingKey...), now: time.Now}
}

func (s *Service) Login(ctx context.Context, email, password, userAgent string) (Session, string, string, string, error) {
	normalizedEmail := strings.ToLower(strings.TrimSpace(email))
	if normalizedEmail == "" || password == "" {
		return Session{}, "", "", "", ErrInvalidCredentials
	}

	var accountID uuid.UUID
	var status, passwordHash string
	err := s.pool.QueryRow(ctx, `
		SELECT a.id, a.status, c.password_hash
		FROM accounts a
		JOIN account_credentials c ON c.account_id = a.id
		WHERE a.email_normalized = $1 AND a.deleted_at IS NULL
	`, normalizedEmail).Scan(&accountID, &status, &passwordHash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			_, _ = VerifyPassword(dummyPasswordHash, password)
			return Session{}, "", "", "", ErrInvalidCredentials
		}
		return Session{}, "", "", "", fmt.Errorf("load account credentials: %w", err)
	}
	valid, err := VerifyPassword(passwordHash, password)
	if err != nil {
		return Session{}, "", "", "", fmt.Errorf("verify stored password hash: %w", err)
	}
	if !valid {
		return Session{}, "", "", "", ErrInvalidCredentials
	}
	if status != "active" {
		return Session{}, "", "", "", ErrAccountUnavailable
	}

	account, err := s.loadAccount(ctx, s.pool, accountID)
	if err != nil {
		return Session{}, "", "", "", err
	}
	refreshToken, err := randomToken()
	if err != nil {
		return Session{}, "", "", "", err
	}
	csrfToken, err := randomToken()
	if err != nil {
		return Session{}, "", "", "", err
	}
	sessionID := uuid.New()
	now := s.now().UTC()
	refreshExpiresAt := now.Add(refreshTokenLifetime)
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Session{}, "", "", "", fmt.Errorf("begin account session creation: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := tx.Exec(ctx, `
		INSERT INTO user_sessions (id, account_id, token_hash, csrf_hash, expires_at, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, sessionID, accountID, hashToken(refreshToken), hashToken(csrfToken), refreshExpiresAt, truncate(userAgent, 512)); err != nil {
		return Session{}, "", "", "", fmt.Errorf("create account session: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO session_refresh_tokens (id, session_id, token_hash, csrf_hash)
		VALUES ($1, $2, $3, $4)
	`, uuid.New(), sessionID, hashToken(refreshToken), hashToken(csrfToken)); err != nil {
		return Session{}, "", "", "", fmt.Errorf("record initial refresh token: %w", err)
	}
	session, accessToken, err := s.newAccessSession(sessionID, account, refreshExpiresAt)
	if err != nil {
		return Session{}, "", "", "", err
	}
	if err := tx.Commit(ctx); err != nil {
		return Session{}, "", "", "", fmt.Errorf("commit account session creation: %w", err)
	}
	return session, accessToken, refreshToken, csrfToken, nil
}

func (s *Service) Authenticate(ctx context.Context, accessToken string) (Session, error) {
	claims, err := s.parseAccessToken(accessToken)
	if err != nil {
		return Session{}, ErrSessionInvalid
	}
	sessionID, err := uuid.Parse(claims.SessionID)
	if err != nil {
		return Session{}, ErrSessionInvalid
	}
	accountID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return Session{}, ErrSessionInvalid
	}
	expiresAt := claims.ExpiresAt.Time
	var refreshExpiresAt time.Time
	err = s.pool.QueryRow(ctx, `
		SELECT s.expires_at
		FROM user_sessions s
		JOIN accounts a ON a.id = s.account_id
		WHERE s.id = $1 AND s.account_id = $2
		  AND s.revoked_at IS NULL
		  AND s.expires_at > now()
		  AND a.status = 'active'
		  AND a.deleted_at IS NULL
	`, sessionID, accountID).Scan(&refreshExpiresAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Session{}, ErrSessionInvalid
		}
		return Session{}, fmt.Errorf("validate access-token session: %w", err)
	}
	if _, err := s.pool.Exec(ctx, "UPDATE user_sessions SET last_seen_at = now() WHERE id = $1", sessionID); err != nil {
		return Session{}, fmt.Errorf("update session activity: %w", err)
	}
	account, err := s.loadAccount(ctx, s.pool, accountID)
	if err != nil {
		return Session{}, err
	}
	return Session{ID: sessionID, Account: account, ExpiresAt: expiresAt, RefreshExpiresAt: refreshExpiresAt}, nil
}

func (s *Service) parseAccessToken(accessToken string) (*accessClaims, error) {
	claims := &accessClaims{}
	parsed, err := jwt.ParseWithClaims(accessToken, claims, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, ErrSessionInvalid
		}
		return s.signingKey, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(jwtIssuer), jwt.WithAudience(jwtAudience),
		jwt.WithExpirationRequired(), jwt.WithIssuedAt(),
		jwt.WithLeeway(30*time.Second), jwt.WithTimeFunc(s.now))
	if err != nil || !parsed.Valid || claims.Subject == "" || claims.ID == "" || claims.SessionID == "" {
		return nil, ErrSessionInvalid
	}
	return claims, nil
}

func (s *Service) Refresh(ctx context.Context, refreshToken, csrfToken string) (Session, string, string, string, error) {
	if refreshToken == "" {
		return Session{}, "", "", "", ErrSessionInvalid
	}
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Session{}, "", "", "", fmt.Errorf("begin refresh-token rotation: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var refreshID, sessionID, accountID uuid.UUID
	var storedCSRF []byte
	var refreshExpiresAt time.Time
	var consumedAt *time.Time
	err = tx.QueryRow(ctx, `
		SELECT rt.id, s.id, s.account_id, rt.consumed_at, rt.csrf_hash, s.expires_at
		FROM session_refresh_tokens rt
		JOIN user_sessions s ON s.id = rt.session_id
		JOIN accounts a ON a.id = s.account_id
		WHERE rt.token_hash = $1 AND s.revoked_at IS NULL
		  AND s.expires_at > now() AND a.status = 'active' AND a.deleted_at IS NULL
		FOR UPDATE OF rt, s
	`, hashToken(refreshToken)).Scan(&refreshID, &sessionID, &accountID, &consumedAt, &storedCSRF, &refreshExpiresAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Session{}, "", "", "", ErrSessionInvalid
		}
		return Session{}, "", "", "", fmt.Errorf("load refresh session: %w", err)
	}
	if csrfToken == "" || !equalBytes(storedCSRF, hashToken(csrfToken)) {
		return Session{}, "", "", "", ErrCSRFInvalid
	}
	if consumedAt != nil {
		if _, err := tx.Exec(ctx, `
			UPDATE user_sessions SET revoked_at = now()
			WHERE id = $1 AND revoked_at IS NULL
		`, sessionID); err != nil {
			return Session{}, "", "", "", fmt.Errorf("revoke session after refresh-token reuse: %w", err)
		}
		if err := tx.Commit(ctx); err != nil {
			return Session{}, "", "", "", fmt.Errorf("commit refresh-token reuse revocation: %w", err)
		}
		return Session{}, "", "", "", ErrSessionInvalid
	}
	newRefreshToken, err := randomToken()
	if err != nil {
		return Session{}, "", "", "", err
	}
	newCSRFToken, err := randomToken()
	if err != nil {
		return Session{}, "", "", "", err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE session_refresh_tokens SET consumed_at = now()
		WHERE id = $1 AND consumed_at IS NULL
	`, refreshID); err != nil {
		return Session{}, "", "", "", fmt.Errorf("mark refresh token as consumed: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO session_refresh_tokens (id, session_id, token_hash, csrf_hash)
		VALUES ($1, $2, $3, $4)
	`, uuid.New(), sessionID, hashToken(newRefreshToken), hashToken(newCSRFToken)); err != nil {
		return Session{}, "", "", "", fmt.Errorf("store rotated refresh token: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		UPDATE user_sessions
		SET token_hash = $1, csrf_hash = $2, last_seen_at = now()
		WHERE id = $3
	`, hashToken(newRefreshToken), hashToken(newCSRFToken), sessionID); err != nil {
		return Session{}, "", "", "", fmt.Errorf("rotate refresh token: %w", err)
	}
	account, err := s.loadAccount(ctx, tx, accountID)
	if err != nil {
		return Session{}, "", "", "", err
	}
	session, accessToken, err := s.newAccessSession(sessionID, account, refreshExpiresAt)
	if err != nil {
		return Session{}, "", "", "", err
	}
	if err := tx.Commit(ctx); err != nil {
		return Session{}, "", "", "", fmt.Errorf("commit refresh-token rotation: %w", err)
	}
	return session, accessToken, newRefreshToken, newCSRFToken, nil
}

func (s *Service) ValidateCSRF(ctx context.Context, sessionID uuid.UUID, token string) error {
	if token == "" {
		return ErrCSRFInvalid
	}
	var storedHash []byte
	err := s.pool.QueryRow(ctx, `
		SELECT csrf_hash FROM user_sessions
		WHERE id = $1 AND revoked_at IS NULL AND expires_at > now()
	`, sessionID).Scan(&storedHash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrSessionInvalid
		}
		return fmt.Errorf("load session CSRF state: %w", err)
	}
	if !equalBytes(storedHash, hashToken(token)) {
		return ErrCSRFInvalid
	}
	return nil
}

func (s *Service) newAccessSession(sessionID uuid.UUID, account Account, refreshExpiresAt time.Time) (Session, string, error) {
	now := s.now().UTC()
	expiresAt := now.Add(accessTokenLifetime)
	if expiresAt.After(refreshExpiresAt) {
		expiresAt = refreshExpiresAt
	}
	claims := accessClaims{
		SessionID: sessionID.String(),
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    jwtIssuer,
			Subject:   account.ID.String(),
			Audience:  jwt.ClaimStrings{jwtAudience},
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			NotBefore: jwt.NewNumericDate(now),
			IssuedAt:  jwt.NewNumericDate(now),
			ID:        uuid.NewString(),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	encoded, err := token.SignedString(s.signingKey)
	if err != nil {
		return Session{}, "", fmt.Errorf("sign access token: %w", err)
	}
	return Session{
		ID:               sessionID,
		Account:          account,
		ExpiresAt:        expiresAt,
		RefreshExpiresAt: refreshExpiresAt,
	}, encoded, nil
}

func (s *Service) Logout(ctx context.Context, sessionID uuid.UUID) error {
	if _, err := s.pool.Exec(ctx, `
		UPDATE user_sessions SET revoked_at = now()
		WHERE id = $1 AND revoked_at IS NULL
	`, sessionID); err != nil {
		return fmt.Errorf("revoke account session: %w", err)
	}
	return nil
}

func (s *Service) LogoutRefresh(ctx context.Context, refreshToken, csrfToken string) error {
	if refreshToken == "" {
		return ErrSessionInvalid
	}
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin session revocation: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var sessionID uuid.UUID
	var storedCSRF []byte
	err = tx.QueryRow(ctx, `
		SELECT id, csrf_hash FROM user_sessions
		WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
		FOR UPDATE
	`, hashToken(refreshToken)).Scan(&sessionID, &storedCSRF)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrSessionInvalid
		}
		return fmt.Errorf("load session for revocation: %w", err)
	}
	if csrfToken == "" || !equalBytes(storedCSRF, hashToken(csrfToken)) {
		return ErrCSRFInvalid
	}
	if _, err := tx.Exec(ctx, "UPDATE user_sessions SET revoked_at = now() WHERE id = $1", sessionID); err != nil {
		return fmt.Errorf("revoke account session: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit session revocation: %w", err)
	}
	return nil
}

type queryer interface {
	QueryRow(context.Context, string, ...any) pgx.Row
	Query(context.Context, string, ...any) (pgx.Rows, error)
}

func (s *Service) loadAccount(ctx context.Context, q queryer, accountID uuid.UUID) (Account, error) {
	var account Account
	err := q.QueryRow(ctx, `
		SELECT id, email, display_name, status, preferred_language, timezone
		FROM accounts WHERE id = $1 AND deleted_at IS NULL
	`, accountID).Scan(
		&account.ID, &account.Email, &account.DisplayName, &account.Status,
		&account.PreferredLanguage, &account.Timezone,
	)
	if err != nil {
		return Account{}, fmt.Errorf("load authenticated account: %w", err)
	}

	account.Roles = make([]string, 0, 2)
	rows, err := q.Query(ctx, `
		SELECT r.code FROM account_roles ar
		JOIN roles r ON r.id = ar.role_id
		WHERE ar.account_id = $1
		ORDER BY r.code
	`, accountID)
	if err != nil {
		return Account{}, fmt.Errorf("load account roles: %w", err)
	}
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			rows.Close()
			return Account{}, fmt.Errorf("scan account role: %w", err)
		}
		account.Roles = append(account.Roles, role)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return Account{}, fmt.Errorf("iterate account roles: %w", err)
	}
	rows.Close()

	account.Assignments = make([]Scope, 0, 2)
	rows, err = q.Query(ctx, `
		SELECT scope_type, country_id, region_id, branch_id
		FROM account_scope_assignments
		WHERE account_id = $1
		ORDER BY scope_type, country_id, region_id, branch_id
	`, accountID)
	if err != nil {
		return Account{}, fmt.Errorf("load account scope assignments: %w", err)
	}
	for rows.Next() {
		var scope Scope
		if err := rows.Scan(&scope.Type, &scope.CountryID, &scope.RegionID, &scope.BranchID); err != nil {
			rows.Close()
			return Account{}, fmt.Errorf("scan account scope: %w", err)
		}
		account.Assignments = append(account.Assignments, scope)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return Account{}, fmt.Errorf("iterate account scopes: %w", err)
	}
	rows.Close()
	return account, nil
}

func randomToken() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("generate session token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

func hashToken(token string) []byte {
	sum := sha256.Sum256([]byte(token))
	return sum[:]
}

func equalBytes(first, second []byte) bool {
	return subtle.ConstantTimeCompare(first, second) == 1
}

func truncate(value string, maxLength int) string {
	if len(value) <= maxLength {
		return value
	}

	return value[:maxLength]
}
