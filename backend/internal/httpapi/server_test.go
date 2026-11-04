package httpapi

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type fakeProber struct {
	err error
}

func (p fakeProber) Ping(context.Context) error {
	return p.err
}

func TestLiveHealthCheck(t *testing.T) {
	handler := NewServer(ServerConfig{
		Environment:     "test",
		AllowedOrigins:  []string{"http://localhost:4200"},
		ReadinessProber: fakeProber{},
		Logger:          slog.New(slog.NewTextHandler(httptest.NewRecorder(), nil)),
	}).Handler()

	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/health/live", nil))

	if response.Code != http.StatusOK {
		t.Fatalf("expected %d, got %d", http.StatusOK, response.Code)
	}
	if !strings.Contains(response.Body.String(), `"status":"ok"`) {
		t.Fatalf("unexpected health response: %s", response.Body.String())
	}
	if response.Header().Get("X-Request-ID") == "" {
		t.Fatal("expected a request ID response header")
	}
	if response.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Fatal("expected security headers")
	}
}

func TestReadinessCheckFailsClosed(t *testing.T) {
	handler := NewServer(ServerConfig{
		Environment:    "test",
		AllowedOrigins: []string{"http://localhost:4200"},
	}).Handler()

	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/health/ready", nil))

	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected %d, got %d", http.StatusServiceUnavailable, response.Code)
	}
}

func TestReadinessCheckHidesDependencyError(t *testing.T) {
	handler := NewServer(ServerConfig{
		Environment:     "test",
		AllowedOrigins:  []string{"http://localhost:4200"},
		ReadinessProber: fakeProber{err: errors.New("private database detail")},
		Logger:          slog.New(slog.NewTextHandler(httptest.NewRecorder(), nil)),
	}).Handler()

	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/health/ready", nil))

	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected %d, got %d", http.StatusServiceUnavailable, response.Code)
	}
	if strings.Contains(response.Body.String(), "private database detail") {
		t.Fatal("dependency details must not be returned to clients")
	}
}

func TestCORSRejectsUnlistedOrigin(t *testing.T) {
	handler := NewServer(ServerConfig{
		Environment:     "test",
		AllowedOrigins:  []string{"http://localhost:4200"},
		ReadinessProber: fakeProber{},
	}).Handler()

	request := httptest.NewRequest(http.MethodGet, "/health/live", nil)
	request.Header.Set("Origin", "https://unexpected.example")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusForbidden {
		t.Fatalf("expected %d, got %d", http.StatusForbidden, response.Code)
	}
	if response.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("unlisted origin must not receive CORS permission")
	}
}

func TestCORSPreflight(t *testing.T) {
	handler := NewServer(ServerConfig{
		Environment:     "test",
		AllowedOrigins:  []string{"http://localhost:4200"},
		ReadinessProber: fakeProber{},
	}).Handler()

	request := httptest.NewRequest(http.MethodOptions, "/api/v1/auth/login", nil)
	request.Header.Set("Origin", "http://localhost:4200")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("expected %d, got %d", http.StatusNoContent, response.Code)
	}

	if response.Header().Get("Access-Control-Allow-Origin") != "http://localhost:4200" {
		t.Fatal("expected configured origin to be allowed")
	}
}

func TestSwaggerUIDocumentationRoutes(t *testing.T) {
	handler := NewServer(ServerConfig{
		Environment:    "test",
		AllowedOrigins: []string{"http://localhost:4200"},
	}).Handler()

	uiResponse := httptest.NewRecorder()
	handler.ServeHTTP(uiResponse, httptest.NewRequest(http.MethodGet, "/swagger", nil))
	if uiResponse.Code != http.StatusOK {
		t.Fatalf("expected Swagger UI status %d, got %d", http.StatusOK, uiResponse.Code)
	}
	if !strings.Contains(uiResponse.Header().Get("Content-Type"), "text/html") ||
		!strings.Contains(uiResponse.Body.String(), `url: "/openapi.yaml"`) {
		t.Fatal("Swagger UI must load the served OpenAPI document")
	}

	specResponse := httptest.NewRecorder()
	handler.ServeHTTP(specResponse, httptest.NewRequest(http.MethodGet, "/openapi.yaml", nil))
	if specResponse.Code != http.StatusOK {
		t.Fatalf("expected OpenAPI status %d, got %d", http.StatusOK, specResponse.Code)
	}
	if !strings.Contains(specResponse.Header().Get("Content-Type"), "yaml") ||
		!strings.Contains(specResponse.Body.String(), "openapi: 3.1.0") ||
		!strings.Contains(specResponse.Body.String(), "/auth/refresh:") {
		t.Fatal("OpenAPI route must serve the embedded API specification")
	}
}
