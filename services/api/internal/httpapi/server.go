package httpapi

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/marcellvarga/ai-finance/services/api/internal/auth"
	"github.com/marcellvarga/ai-finance/services/api/internal/store"
)

type Options struct {
	Authenticator *auth.Authenticator
	Assets        *store.SeedAssetStore
	Logger        *slog.Logger
}

type server struct {
	auth   *auth.Authenticator
	assets *store.SeedAssetStore
	logger *slog.Logger
}

func NewHandler(opts Options) http.Handler {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	if opts.Assets == nil {
		opts.Assets = store.NewSeedAssetStore()
	}

	s := &server{
		auth:   opts.Authenticator,
		assets: opts.Assets,
		logger: opts.Logger,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /v1/health", s.health)
	mux.HandleFunc("GET /v1/assets/search", s.searchAssets)
	mux.Handle("GET /v1/me", s.requireAuth(http.HandlerFunc(s.me)))
	mux.Handle("GET /v1/usage", s.requireAuth(http.HandlerFunc(s.usage)))

	return requestID(accessLog(opts.Logger, mux))
}

func (s *server) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":    "ok",
		"service":   "finance-api",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

func (s *server) searchAssets(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	results := s.assets.Search(query, 10)
	writeJSON(w, http.StatusOK, map[string]any{
		"data": results,
		"meta": map[string]any{
			"query":     query,
			"provider":  "seed",
			"freshness": "deterministic-demo-data",
		},
	})
}

func (s *server) me(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"clerkUserId": principal.ClerkUserID,
			"email":       principal.Email,
			"issuer":      principal.Issuer,
		},
	})
}

func (s *server) usage(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"clerkUserId": principal.ClerkUserID,
			"period":      time.Now().UTC().Format("2006-01"),
			"features": []map[string]any{
				{"feature": "portfolio_brief", "used": 0, "limit": 0, "status": "not_configured"},
			},
		},
	})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
