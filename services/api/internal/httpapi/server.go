package httpapi

import (
	"encoding/json"
	"errors"
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
	Workspace     *store.WorkspaceStore
	Logger        *slog.Logger
}

type server struct {
	auth      *auth.Authenticator
	assets    *store.SeedAssetStore
	workspace *store.WorkspaceStore
	logger    *slog.Logger
}

func NewHandler(opts Options) http.Handler {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	if opts.Assets == nil {
		opts.Assets = store.NewSeedAssetStore()
	}
	if opts.Workspace == nil {
		opts.Workspace = store.NewWorkspaceStore(opts.Assets)
	}

	s := &server{
		auth:      opts.Authenticator,
		assets:    opts.Assets,
		workspace: opts.Workspace,
		logger:    opts.Logger,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /v1/health", s.health)
	mux.HandleFunc("GET /v1/assets/search", s.searchAssets)
	mux.Handle("GET /v1/me", s.requireAuth(http.HandlerFunc(s.me)))
	mux.Handle("GET /v1/usage", s.requireAuth(http.HandlerFunc(s.usage)))
	mux.Handle("GET /v1/portfolios", s.requireAuth(http.HandlerFunc(s.listPortfolios)))
	mux.Handle("POST /v1/portfolios", s.requireAuth(http.HandlerFunc(s.createPortfolio)))
	mux.Handle("GET /v1/portfolios/{id}", s.requireAuth(http.HandlerFunc(s.getPortfolio)))
	mux.Handle("PATCH /v1/portfolios/{id}", s.requireAuth(http.HandlerFunc(s.updatePortfolio)))
	mux.Handle("DELETE /v1/portfolios/{id}", s.requireAuth(http.HandlerFunc(s.deletePortfolio)))
	mux.Handle("POST /v1/portfolios/{id}/holdings", s.requireAuth(http.HandlerFunc(s.addHolding)))
	mux.Handle("GET /v1/watchlists", s.requireAuth(http.HandlerFunc(s.listWatchlists)))
	mux.Handle("POST /v1/watchlists", s.requireAuth(http.HandlerFunc(s.createWatchlist)))
	mux.Handle("POST /v1/watchlists/{id}/items", s.requireAuth(http.HandlerFunc(s.addWatchlistItem)))

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

func (s *server) listPortfolios(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	writeJSON(w, http.StatusOK, map[string]any{
		"data": s.workspace.ListPortfolios(principal.ClerkUserID),
		"meta": phase4Meta(),
	})
}

func (s *server) createPortfolio(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	var body struct {
		Name         string `json:"name"`
		BaseCurrency string `json:"baseCurrency"`
		SeedDemo     bool   `json:"seedDemo"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	portfolio, err := s.workspace.CreatePortfolio(principal.ClerkUserID, body.Name, body.BaseCurrency, body.SeedDemo)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"data": portfolio, "meta": phase4Meta()})
}

func (s *server) getPortfolio(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	portfolio, err := s.workspace.GetPortfolio(principal.ClerkUserID, r.PathValue("id"))
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": portfolio, "meta": phase4Meta()})
}

func (s *server) updatePortfolio(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	var body struct {
		Name         string `json:"name"`
		BaseCurrency string `json:"baseCurrency"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	portfolio, err := s.workspace.UpdatePortfolio(principal.ClerkUserID, r.PathValue("id"), body.Name, body.BaseCurrency)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": portfolio, "meta": phase4Meta()})
}

func (s *server) deletePortfolio(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	if err := s.workspace.DeletePortfolio(principal.ClerkUserID, r.PathValue("id")); err != nil {
		writeStoreError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) addHolding(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	var body struct {
		Ticker           string `json:"ticker"`
		Quantity         int64  `json:"quantity"`
		AverageCostCents int64  `json:"averageCostCents"`
		Notes            string `json:"notes"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	portfolio, err := s.workspace.AddHolding(principal.ClerkUserID, r.PathValue("id"), body.Ticker, body.Quantity, body.AverageCostCents, body.Notes)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": portfolio, "meta": phase4Meta()})
}

func (s *server) listWatchlists(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	writeJSON(w, http.StatusOK, map[string]any{
		"data": s.workspace.ListWatchlists(principal.ClerkUserID),
		"meta": phase4Meta(),
	})
}

func (s *server) createWatchlist(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	var body struct {
		Name     string `json:"name"`
		SeedDemo bool   `json:"seedDemo"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	watchlist, err := s.workspace.CreateWatchlist(principal.ClerkUserID, body.Name, body.SeedDemo)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"data": watchlist, "meta": phase4Meta()})
}

func (s *server) addWatchlistItem(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	var body struct {
		Ticker string `json:"ticker"`
		Notes  string `json:"notes"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	watchlist, err := s.workspace.AddWatchlistItem(principal.ClerkUserID, r.PathValue("id"), body.Ticker, body.Notes)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": watchlist, "meta": phase4Meta()})
}

func decodeJSON(r *http.Request, target any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(target)
}

func writeStoreError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, store.ErrNotFound):
		writeError(w, r, http.StatusNotFound, "not_found", "The requested resource was not found.")
	case errors.Is(err, store.ErrBadTicker):
		writeError(w, r, http.StatusBadRequest, "unknown_asset", "The asset ticker is not in the curated demo universe.")
	case errors.Is(err, store.ErrConflict):
		writeError(w, r, http.StatusConflict, "conflict", "The resource already exists.")
	default:
		writeError(w, r, http.StatusInternalServerError, "internal_error", "The request could not be completed.")
	}
}

func phase4Meta() map[string]any {
	return map[string]any{
		"provider":   "demo-seed",
		"freshness":  "deterministic-demo-data",
		"capturedAt": "2026-05-22T21:00:00Z",
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
