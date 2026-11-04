package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"math"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/rpambo/protocol-segurity/backend/internal/identity"
)

const refreshCookiePath = "/api/v1/auth"

type authContextKey struct{}

type authenticatedSession struct {
	session identity.Session
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResponse struct {
	Account     identity.Account `json:"account"`
	AccessToken string           `json:"accessToken,omitempty"`
	CSRFToken   string           `json:"csrfToken,omitempty"`
	ExpiresAt   string           `json:"expiresAt"`
}

func (s *Server) mountAuthentication(router chi.Router) {
	router.Route("/api/v1/auth", func(routes chi.Router) {
		routes.Post("/login", s.login)
		routes.Post("/refresh", s.refresh)
		routes.Post("/logout", s.logout)
		routes.Group(func(protected chi.Router) {
			protected.Use(s.requireSession)
			protected.Get("/me", s.me)
		})
	})
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	if s.config.Identity == nil {
		writeError(w, http.StatusServiceUnavailable, "identity_unavailable", "authentication is not configured")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 8*1024)
	var request loginRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "request body is invalid")
		return
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "invalid_request", "request body must contain one JSON object")
		return
	}
	request.Email = strings.TrimSpace(request.Email)
	if len(request.Email) > 254 || !strings.Contains(request.Email, "@") || len(request.Password) == 0 || len(request.Password) > 1024 {
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "email or password is incorrect")
		return
	}
	if s.config.LoginRateLimiter == nil {
		writeError(w, http.StatusServiceUnavailable, "rate_limiter_unavailable", "sign-in protection is unavailable")
		return
	}
	normalizedEmail := strings.ToLower(request.Email)
	ipAddress := clientIP(r)
	retryAfter, allowed, err := s.config.LoginRateLimiter.CheckLogin(r.Context(), normalizedEmail, ipAddress)
	if err != nil {
		s.config.Logger.ErrorContext(r.Context(), "login rate-limit check failed", "request_id", requestIDFromContext(r.Context()), "error", err)
		writeError(w, http.StatusServiceUnavailable, "rate_limiter_unavailable", "sign-in protection is temporarily unavailable")
		return
	}
	if !allowed {
		seconds := int(math.Ceil(retryAfter.Seconds()))
		if seconds < 1 {
			seconds = 1
		}
		w.Header().Set("Retry-After", strconv.Itoa(seconds))
		writeError(w, http.StatusTooManyRequests, "login_rate_limited", "too many sign-in attempts; try again later")
		return
	}
	session, accessToken, refreshToken, csrfToken, err := s.config.Identity.Login(r.Context(), request.Email, request.Password, r.UserAgent())
	if err != nil {
		switch {
		case errors.Is(err, identity.ErrInvalidCredentials), errors.Is(err, identity.ErrAccountUnavailable):
			writeError(w, http.StatusUnauthorized, "invalid_credentials", "email or password is incorrect")
		default:
			s.config.Logger.ErrorContext(r.Context(), "login failed", "request_id", requestIDFromContext(r.Context()), "error", err)
			writeError(w, http.StatusInternalServerError, "internal_error", "sign-in could not be completed")
		}
		return
	}
	if err := s.config.LoginRateLimiter.ResetLoginIdentity(r.Context(), normalizedEmail); err != nil {
		s.config.Logger.ErrorContext(r.Context(), "login rate-limit reset failed", "request_id", requestIDFromContext(r.Context()), "error", err)
		if revokeErr := s.config.Identity.LogoutRefresh(r.Context(), refreshToken, csrfToken); revokeErr != nil {
			s.config.Logger.ErrorContext(r.Context(), "session revocation after rate-limit failure failed", "request_id", requestIDFromContext(r.Context()), "error", revokeErr)
		}
		writeError(w, http.StatusServiceUnavailable, "rate_limiter_unavailable", "sign-in protection is temporarily unavailable")
		return
	}
	setRefreshCookie(w, s, refreshToken, session.RefreshExpiresAt)
	writeJSON(w, http.StatusOK, authResponse{
		Account:     session.Account,
		AccessToken: accessToken,
		CSRFToken:   csrfToken,
		ExpiresAt:   session.ExpiresAt.UTC().Format(time.RFC3339),
	})
}

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}

func (s *Server) refresh(w http.ResponseWriter, r *http.Request) {
	if s.config.Identity == nil {
		writeError(w, http.StatusServiceUnavailable, "identity_unavailable", "authentication is not configured")
		return
	}
	cookie, err := r.Cookie(s.config.CookieName)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "refresh token is missing")
		return
	}
	session, accessToken, refreshToken, csrfToken, err := s.config.Identity.Refresh(
		r.Context(), cookie.Value, r.Header.Get("X-CSRF-Token"),
	)
	if err != nil {
		writeAuthOperationError(w, s, r, "refresh-token rotation failed", err)
		return
	}
	setRefreshCookie(w, s, refreshToken, session.RefreshExpiresAt)
	writeJSON(w, http.StatusOK, authResponse{
		Account:     session.Account,
		AccessToken: accessToken,
		CSRFToken:   csrfToken,
		ExpiresAt:   session.ExpiresAt.UTC().Format(time.RFC3339),
	})
}

func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	session, ok := sessionFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "sign in is required")
		return
	}
	writeJSON(w, http.StatusOK, authResponse{
		Account:   session.Account,
		ExpiresAt: session.ExpiresAt.UTC().Format(time.RFC3339),
	})
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	if s.config.Identity == nil {
		writeError(w, http.StatusServiceUnavailable, "identity_unavailable", "authentication is not configured")
		return
	}
	cookie, err := r.Cookie(s.config.CookieName)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "refresh token is missing")
		return
	}
	if err := s.config.Identity.LogoutRefresh(r.Context(), cookie.Value, r.Header.Get("X-CSRF-Token")); err != nil {
		writeAuthOperationError(w, s, r, "session revocation failed", err)
		return
	}
	clearRefreshCookie(w, s)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) requireSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s.config.Identity == nil {
			writeError(w, http.StatusServiceUnavailable, "identity_unavailable", "authentication is not configured")
			return
		}
		scheme, token, ok := strings.Cut(r.Header.Get("Authorization"), " ")
		if !ok || !strings.EqualFold(scheme, "Bearer") || strings.TrimSpace(token) == "" || strings.ContainsAny(strings.TrimSpace(token), " \t\r\n") {
			writeError(w, http.StatusUnauthorized, "unauthenticated", "a bearer access token is required")
			return
		}
		session, err := s.config.Identity.Authenticate(r.Context(), strings.TrimSpace(token))
		if err != nil {
			if errors.Is(err, identity.ErrSessionInvalid) {
				writeError(w, http.StatusUnauthorized, "unauthenticated", "access token is invalid or expired")
				return
			}
			s.config.Logger.ErrorContext(r.Context(), "access token validation failed", "request_id", requestIDFromContext(r.Context()), "error", err)
			writeError(w, http.StatusInternalServerError, "internal_error", "session could not be validated")
			return
		}
		ctx := context.WithValue(r.Context(), authContextKey{}, authenticatedSession{session: session})
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func setRefreshCookie(w http.ResponseWriter, s *Server, refreshToken string, expiresAt time.Time) {
	maxAge := int(time.Until(expiresAt).Seconds())
	if maxAge < 1 {
		maxAge = 1
	}
	http.SetCookie(w, &http.Cookie{
		Name:     s.config.CookieName,
		Value:    refreshToken,
		Path:     refreshCookiePath,
		Expires:  expiresAt,
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   s.config.CookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

func clearRefreshCookie(w http.ResponseWriter, s *Server) {
	http.SetCookie(w, &http.Cookie{
		Name:     s.config.CookieName,
		Value:    "",
		Path:     refreshCookiePath,
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   s.config.CookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

func writeAuthOperationError(w http.ResponseWriter, s *Server, r *http.Request, message string, err error) {
	switch {
	case errors.Is(err, identity.ErrSessionInvalid):
		writeError(w, http.StatusUnauthorized, "unauthenticated", "refresh token is invalid or expired")
	case errors.Is(err, identity.ErrCSRFInvalid):
		writeError(w, http.StatusForbidden, "csrf_invalid", "request verification failed")
	default:
		s.config.Logger.ErrorContext(r.Context(), message, "request_id", requestIDFromContext(r.Context()), "error", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "session operation could not be completed")
	}
}

func sessionFromContext(ctx context.Context) (identity.Session, bool) {
	value, ok := ctx.Value(authContextKey{}).(authenticatedSession)
	return value.session, ok
}
