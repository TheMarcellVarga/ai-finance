package httpapi

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/marcellvarga/ai-finance/services/api/internal/auth"
	"github.com/marcellvarga/ai-finance/services/api/internal/store"
)

func testHandler(t *testing.T) http.Handler {
	t.Helper()
	authenticator, err := auth.NewAuthenticator(auth.Config{
		Mode:      "dev",
		Env:       "test",
		DevPrefix: "dev:",
	}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	if err != nil {
		t.Fatal(err)
	}
	return NewHandler(Options{
		Authenticator: authenticator,
		Assets:        store.NewSeedAssetStore(),
		Logger:        slog.New(slog.NewTextHandler(io.Discard, nil)),
	})
}

func TestHealth(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/v1/health", nil)
	res := httptest.NewRecorder()

	testHandler(t).ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", res.Code, res.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["status"] != "ok" {
		t.Fatalf("expected status ok, got %v", body["status"])
	}
}

func TestProtectedRouteRequiresAuth(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	res := httptest.NewRecorder()

	testHandler(t).ServeHTTP(res, req)

	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", res.Code)
	}
	var body map[string]map[string]string
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["error"]["code"] != "unauthorized" {
		t.Fatalf("expected structured unauthorized error, got %#v", body)
	}
}

func TestProtectedRouteAcceptsDevPrincipal(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req.Header.Set("Authorization", "Bearer dev:user_test_123")
	res := httptest.NewRecorder()

	testHandler(t).ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", res.Code, res.Body.String())
	}
	if !json.Valid(res.Body.Bytes()) {
		t.Fatalf("expected json response")
	}
}

func TestAssetSearchUsesSeedData(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/v1/assets/search?q=apple", nil)
	res := httptest.NewRecorder()

	testHandler(t).ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.Code)
	}
	if got := res.Body.String(); !contains(got, "AAPL") {
		t.Fatalf("expected AAPL in response, got %s", got)
	}
}

func contains(value string, needle string) bool {
	for i := 0; i+len(needle) <= len(value); i++ {
		if value[i:i+len(needle)] == needle {
			return true
		}
	}
	return false
}
