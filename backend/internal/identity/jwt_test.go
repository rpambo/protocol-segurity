package identity

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func TestAccessTokenCarriesValidatedStandardClaims(t *testing.T) {
	now := time.Date(2026, 11, 4, 10, 0, 0, 0, time.UTC)
	service := &Service{
		signingKey: []byte("0123456789abcdef0123456789abcdef"),
		now:        func() time.Time { return now },
	}
	accountID := uuid.New()
	sessionID := uuid.New()
	account := Account{ID: accountID}
	refreshExpiry := now.Add(refreshTokenLifetime)

	session, token, err := service.newAccessSession(sessionID, account, refreshExpiry)
	if err != nil {
		t.Fatal(err)
	}
	claims, err := service.parseAccessToken(token)
	if err != nil {
		t.Fatalf("expected valid access token, got %v", err)
	}
	if claims.Subject != accountID.String() || claims.SessionID != sessionID.String() {
		t.Fatalf("unexpected token identity claims: subject=%q session=%q", claims.Subject, claims.SessionID)
	}
	if claims.Issuer != jwtIssuer || len(claims.Audience) != 1 || claims.Audience[0] != jwtAudience {
		t.Fatalf("unexpected issuer/audience claims: issuer=%q audience=%v", claims.Issuer, claims.Audience)
	}
	if got := session.ExpiresAt.Sub(now); got != accessTokenLifetime {
		t.Fatalf("expected %s access-token lifetime, got %s", accessTokenLifetime, got)
	}
}

func TestAccessTokenRejectsInvalidSignature(t *testing.T) {
	now := time.Now().UTC()
	signer := &Service{
		signingKey: []byte("0123456789abcdef0123456789abcdef"),
		now:        func() time.Time { return now },
	}
	validator := &Service{
		signingKey: []byte("fedcba9876543210fedcba9876543210"),
		now:        func() time.Time { return now },
	}
	_, token, err := signer.newAccessSession(uuid.New(), Account{ID: uuid.New()}, now.Add(refreshTokenLifetime))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := validator.parseAccessToken(token); err == nil {
		t.Fatal("expected token with an invalid signature to be rejected")
	}
}

func TestAccessTokenRejectsExpiredToken(t *testing.T) {
	now := time.Now().UTC()
	service := &Service{
		signingKey: []byte("0123456789abcdef0123456789abcdef"),
		now:        func() time.Time { return now },
	}
	expiredClaims := accessClaims{
		SessionID: uuid.NewString(),
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    jwtIssuer,
			Subject:   uuid.NewString(),
			Audience:  jwt.ClaimStrings{jwtAudience},
			ExpiresAt: jwt.NewNumericDate(now.Add(-time.Minute)),
			NotBefore: jwt.NewNumericDate(now.Add(-time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now.Add(-time.Hour)),
			ID:        uuid.NewString(),
		},
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, expiredClaims).SignedString(service.signingKey)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := service.parseAccessToken(token); err == nil {
		t.Fatal("expected expired token to be rejected")
	}
}

func TestAccessTokenRejectsWrongIssuer(t *testing.T) {
	now := time.Now().UTC()
	service := &Service{
		signingKey: []byte("0123456789abcdef0123456789abcdef"),
		now:        func() time.Time { return now },
	}
	claims := accessClaims{
		SessionID: uuid.NewString(),
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "untrusted-issuer",
			Subject:   uuid.NewString(),
			Audience:  jwt.ClaimStrings{jwtAudience},
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Minute)),
			NotBefore: jwt.NewNumericDate(now),
			IssuedAt:  jwt.NewNumericDate(now),
			ID:        uuid.NewString(),
		},
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(service.signingKey)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := service.parseAccessToken(token); err == nil {
		t.Fatal("expected token with an incorrect issuer to be rejected")
	}
}

func TestAccessTokenRejectsWrongAudience(t *testing.T) {
	now := time.Now().UTC()
	service := &Service{
		signingKey: []byte("0123456789abcdef0123456789abcdef"),
		now:        func() time.Time { return now },
	}
	claims := accessClaims{
		SessionID: uuid.NewString(),
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    jwtIssuer,
			Subject:   uuid.NewString(),
			Audience:  jwt.ClaimStrings{"untrusted-client"},
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Minute)),
			NotBefore: jwt.NewNumericDate(now),
			IssuedAt:  jwt.NewNumericDate(now),
			ID:        uuid.NewString(),
		},
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(service.signingKey)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := service.parseAccessToken(token); err == nil {
		t.Fatal("expected token with an incorrect audience to be rejected")
	}
}

func TestAccessTokenRejectsFutureNotBefore(t *testing.T) {
	now := time.Now().UTC()
	service := &Service{
		signingKey: []byte("0123456789abcdef0123456789abcdef"),
		now:        func() time.Time { return now },
	}
	claims := accessClaims{
		SessionID: uuid.NewString(),
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    jwtIssuer,
			Subject:   uuid.NewString(),
			Audience:  jwt.ClaimStrings{jwtAudience},
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Hour)),
			NotBefore: jwt.NewNumericDate(now.Add(time.Minute)),
			IssuedAt:  jwt.NewNumericDate(now),
			ID:        uuid.NewString(),
		},
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(service.signingKey)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := service.parseAccessToken(token); err == nil {
		t.Fatal("expected token with a future not-before time to be rejected")
	}
}
