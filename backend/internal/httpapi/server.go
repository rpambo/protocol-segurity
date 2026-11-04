package httpapi

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	apidocs "github.com/rpambo/protocol-segurity/backend/api"
	"github.com/rpambo/protocol-segurity/backend/internal/identity"
)

type ReadinessProber interface {
	Ping(context.Context) error
}

type LoginRateLimiter interface {
	CheckLogin(context.Context, string, string) (time.Duration, bool, error)
	ResetLoginIdentity(context.Context, string) error
}

type ServerConfig struct {
	Environment      string
	AllowedOrigins   []string
	ReadinessProber  ReadinessProber
	LoginRateLimiter LoginRateLimiter
	Identity         *identity.Service
	CookieSecure     bool
	CookieName       string
	Logger           *slog.Logger
}

type Server struct {
	config ServerConfig
}

func NewServer(cfg ServerConfig) *Server {
	if cfg.Logger == nil {
		cfg.Logger = slog.Default()
	}
	return &Server{config: cfg}
}

func (s *Server) Handler() http.Handler {
	if s.config.CookieName == "" {
		s.config.CookieName = "spirit_embassy_session"
	}
	router := chi.NewRouter()
	router.Use(s.requestID)
	router.Use(s.recoverPanic)
	router.Use(s.securityHeaders)
	router.Use(s.cors)

	router.Get("/health/live", s.live)
	router.Get("/health/ready", s.ready)
	router.Get("/api/v1/health/live", s.live)
	router.Get("/api/v1/health/ready", s.ready)
	router.Get("/openapi.yaml", s.openapi)
	router.Get("/swagger", s.swaggerUI)
	router.Get("/swagger/", s.swaggerUI)
	s.mountAuthentication(router)
	router.MethodNotAllowed(func(w http.ResponseWriter, r *http.Request) {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed")
	})
	router.NotFound(func(w http.ResponseWriter, r *http.Request) {
		writeError(w, http.StatusNotFound, "not_found", "resource not found")
	})

	return router
}

func (s *Server) openapi(w http.ResponseWriter, _ *http.Request) {
	document, err := apidocs.Files.ReadFile("openapi.yaml")
	if err != nil {
		s.config.Logger.Error("OpenAPI document read failed", "error", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "API documentation is unavailable")
		return
	}
	w.Header().Set("Content-Type", "application/yaml; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=300")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(document)
}

func (s *Server) swaggerUI(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(swaggerHTML))
}

const swaggerHTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Spirit Embassy API — Swagger UI</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => SwaggerUIBundle({
        url: "/openapi.yaml",
        dom_id: "#swagger-ui",
        deepLinking: true,
        persistAuthorization: false,
        displayRequestDuration: true
      });
    </script>
  </body>
</html>`

func (s *Server) live(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) ready(w http.ResponseWriter, r *http.Request) {
	if s.config.ReadinessProber == nil {
		writeError(w, http.StatusServiceUnavailable, "not_ready", "service dependencies are unavailable")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := s.config.ReadinessProber.Ping(ctx); err != nil {
		s.config.Logger.ErrorContext(ctx, "readiness check failed", "request_id", requestIDFromContext(r.Context()), "error", err)
		writeError(w, http.StatusServiceUnavailable, "not_ready", "service dependencies are unavailable")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

func (s *Server) requestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := uuid.NewString()
		w.Header().Set("X-Request-ID", requestID)
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), requestIDKey{}, requestID)))
	})
}

func (s *Server) recoverPanic(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				s.config.Logger.ErrorContext(r.Context(), "HTTP handler panic",
					"request_id", requestIDFromContext(r.Context()),
					"panic", recovered)
				writeError(w, http.StatusInternalServerError, "internal_error", "an internal error occurred")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func (s *Server) securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Cache-Control", "no-store")
		if s.config.Environment == "production" {
			w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) cors(next http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(s.config.AllowedOrigins))
	for _, origin := range s.config.AllowedOrigins {
		allowed[origin] = struct{}{}
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			if _, ok := allowed[origin]; ok {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Add("Vary", "Origin")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, X-Request-ID, X-CSRF-Token")
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Max-Age", "300")
			} else {
				writeError(w, http.StatusForbidden, "origin_not_allowed", "origin is not allowed")
				return
			}
		}
		if r.Method == http.MethodOptions {
			if origin == "" || w.Header().Get("Access-Control-Allow-Origin") == "" {
				writeError(w, http.StatusForbidden, "origin_not_allowed", "origin is not allowed")
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

type requestIDKey struct{}

func requestIDFromContext(ctx context.Context) string {
	value, _ := ctx.Value(requestIDKey{}).(string)
	return value
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]string{
		"code":    code,
		"message": strings.TrimSpace(message),
	})
}
