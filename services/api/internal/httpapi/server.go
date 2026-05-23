package httpapi

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/marcellvarga/ai-finance/services/api/internal/auth"
	"github.com/marcellvarga/ai-finance/services/api/internal/providers"
	"github.com/marcellvarga/ai-finance/services/api/internal/store"
)

type Options struct {
	Authenticator *auth.Authenticator
	AssetProvider providers.AssetSearchProvider
	QuoteProvider providers.QuoteProvider
	ChartProvider providers.IntradayProvider
	Workspace     *store.WorkspaceStore
	Logger        *slog.Logger
}

type server struct {
	auth          *auth.Authenticator
	assetProvider providers.AssetSearchProvider
	quoteProvider providers.QuoteProvider
	chartProvider providers.IntradayProvider
	workspace     *store.WorkspaceStore
	logger        *slog.Logger
}

func NewHandler(opts Options) http.Handler {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	if opts.Workspace == nil {
		opts.Workspace = store.NewWorkspaceStore()
	}

	s := &server{
		auth:          opts.Authenticator,
		assetProvider: opts.AssetProvider,
		quoteProvider: opts.QuoteProvider,
		chartProvider: opts.ChartProvider,
		workspace:     opts.Workspace,
		logger:        opts.Logger,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /v1/health", s.health)
	mux.HandleFunc("GET /v1/assets/search", s.searchAssets)
	mux.HandleFunc("GET /v1/assets/{ticker}/quote", s.quoteAsset)
	mux.HandleFunc("GET /v1/assets/{ticker}/intraday", s.intradayAsset)
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
	if s.assetProvider == nil {
		writeError(w, r, http.StatusServiceUnavailable, "provider_not_configured", "Real asset search provider is not configured.")
		return
	}
	profiles, err := s.assetProvider.SearchAssets(r.Context(), query)
	if err != nil {
		writeError(w, r, http.StatusBadGateway, "provider_error", "Real asset search provider could not complete the request.")
		return
	}
	results := make([]store.Asset, 0, len(profiles))
	for _, profile := range profiles {
		results = append(results, assetFromProfile(profile, providers.QuoteSnapshot{}))
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data": results,
		"meta": map[string]any{
			"query":     query,
			"provider":  "real-provider",
			"freshness": "provider-reported",
		},
	})
}

func (s *server) quoteAsset(w http.ResponseWriter, r *http.Request) {
	if s.quoteProvider == nil {
		writeError(w, r, http.StatusServiceUnavailable, "provider_not_configured", "Real quote provider is not configured.")
		return
	}
	quote, err := s.quoteProvider.LatestQuote(r.Context(), r.PathValue("ticker"))
	if err != nil {
		writeError(w, r, http.StatusBadGateway, "provider_error", "Real quote provider could not complete the request.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data": quote,
		"meta": map[string]any{
			"provider":   quote.Provider,
			"freshness":  quote.Freshness,
			"capturedAt": quote.Timestamp.UTC().Format(time.RFC3339),
		},
	})
}

func (s *server) intradayAsset(w http.ResponseWriter, r *http.Request) {
	if s.chartProvider == nil {
		writeError(w, r, http.StatusServiceUnavailable, "provider_not_configured", "Real intraday market data provider is not configured.")
		return
	}
	interval := strings.TrimSpace(r.URL.Query().Get("interval"))
	limit := 78
	points, err := s.chartProvider.IntradayPrices(r.Context(), r.PathValue("ticker"), interval, limit)
	if err != nil {
		writeError(w, r, http.StatusBadGateway, "provider_error", "Real intraday market data provider could not complete the request.")
		return
	}
	capturedAt := time.Now().UTC().Format(time.RFC3339)
	if len(points) > 0 {
		capturedAt = points[len(points)-1].Timestamp.UTC().Format(time.RFC3339)
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data": points,
		"meta": map[string]any{
			"provider":   "twelve-data",
			"freshness":  "provider-reported",
			"capturedAt": capturedAt,
			"interval":   "5min",
			"ticker":     strings.ToUpper(strings.TrimSpace(r.PathValue("ticker"))),
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
		Name            string `json:"name"`
		BaseCurrency    string `json:"baseCurrency"`
		InitialHoldings []struct {
			Ticker           string `json:"ticker"`
			Quantity         int64  `json:"quantity"`
			AverageCostCents int64  `json:"averageCostCents"`
			Notes            string `json:"notes"`
		} `json:"initialHoldings"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	initialHoldings := make([]store.Holding, 0, len(body.InitialHoldings))
	for _, requested := range body.InitialHoldings {
		asset, err := s.realAsset(r, requested.Ticker)
		if err != nil {
			s.logger.Warn("real asset lookup failed", "ticker", requested.Ticker, "error", err)
			writeProviderOrStoreError(w, r, err)
			return
		}
		initialHoldings = append(initialHoldings, store.Holding{
			Asset:            asset,
			Quantity:         requested.Quantity,
			AverageCostCents: requested.AverageCostCents,
			Notes:            requested.Notes,
		})
	}
	portfolio, err := s.workspace.CreatePortfolio(principal.ClerkUserID, body.Name, body.BaseCurrency, initialHoldings)
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
	asset, err := s.realAsset(r, body.Ticker)
	if err != nil {
		s.logger.Warn("real asset lookup failed", "ticker", body.Ticker, "error", err)
		writeProviderOrStoreError(w, r, err)
		return
	}
	portfolio, err := s.workspace.AddHolding(principal.ClerkUserID, r.PathValue("id"), asset, body.Quantity, body.AverageCostCents, body.Notes)
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
		Name          string   `json:"name"`
		InitialAssets []string `json:"initialAssets"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Request body must be valid JSON.")
		return
	}
	initialAssets := make([]store.Asset, 0, len(body.InitialAssets))
	for _, ticker := range body.InitialAssets {
		asset, err := s.realAsset(r, ticker)
		if err != nil {
			s.logger.Warn("real asset lookup failed", "ticker", ticker, "error", err)
			writeProviderOrStoreError(w, r, err)
			return
		}
		initialAssets = append(initialAssets, asset)
	}
	watchlist, err := s.workspace.CreateWatchlist(principal.ClerkUserID, body.Name, initialAssets)
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
	asset, err := s.realAsset(r, body.Ticker)
	if err != nil {
		s.logger.Warn("real asset lookup failed", "ticker", body.Ticker, "error", err)
		writeProviderOrStoreError(w, r, err)
		return
	}
	watchlist, err := s.workspace.AddWatchlistItem(principal.ClerkUserID, r.PathValue("id"), asset, body.Notes)
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

func (s *server) realAsset(r *http.Request, ticker string) (store.Asset, error) {
	ticker = strings.ToUpper(strings.TrimSpace(ticker))
	if ticker == "" {
		return store.Asset{}, store.ErrBadTicker
	}
	if s.assetProvider == nil || s.quoteProvider == nil {
		return store.Asset{}, providers.ErrProviderNotConfigured
	}

	profiles, err := s.assetProvider.SearchAssets(r.Context(), ticker)
	if err != nil {
		return store.Asset{}, err
	}
	var profile providers.AssetProfile
	for _, candidate := range profiles {
		if strings.EqualFold(candidate.Ticker, ticker) {
			profile = candidate
			break
		}
	}
	if profile.Ticker == "" {
		return store.Asset{}, store.ErrBadTicker
	}
	if profile.PriceCents > 0 {
		return assetFromProfile(profile, providers.QuoteSnapshot{
			Ticker:        profile.Ticker,
			PriceCents:    profile.PriceCents,
			DisplayPrice:  profile.DisplayPrice,
			DailyChangeBp: profile.DailyChangeBp,
			Timestamp:     profile.FreshAt,
			Provider:      profile.Provider,
			Freshness:     "provider-reported",
		}), nil
	}

	quote, err := s.quoteProvider.LatestQuote(r.Context(), profile.Ticker)
	if err != nil {
		return store.Asset{}, err
	}
	return assetFromProfile(profile, quote), nil
}

func assetFromProfile(profile providers.AssetProfile, quote providers.QuoteSnapshot) store.Asset {
	capturedAt := ""
	if !profile.FreshAt.IsZero() {
		capturedAt = profile.FreshAt.UTC().Format(time.RFC3339)
	}
	if !quote.Timestamp.IsZero() {
		capturedAt = quote.Timestamp.UTC().Format(time.RFC3339)
	}
	provider := profile.Provider
	if quote.Provider != "" {
		provider = quote.Provider
	}
	freshness := "provider-reported"
	if quote.Freshness != "" {
		freshness = quote.Freshness
	}
	return store.Asset{
		Ticker:        strings.ToUpper(strings.TrimSpace(profile.Ticker)),
		Name:          strings.TrimSpace(profile.Name),
		Exchange:      strings.TrimSpace(profile.Exchange),
		Type:          strings.TrimSpace(profile.Type),
		Sector:        strings.TrimSpace(profile.Sector),
		CIK:           strings.TrimSpace(profile.CIK),
		PriceCents:    quote.PriceCents,
		CapturedAt:    capturedAt,
		Freshness:     freshness,
		Provider:      provider,
		DisplayPrice:  firstNonEmptyString(quote.DisplayPrice, profile.DisplayPrice),
		DailyChangeBp: firstNonZeroInt(quote.DailyChangeBp, profile.DailyChangeBp),
	}
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func firstNonZeroInt(values ...int) int {
	for _, value := range values {
		if value != 0 {
			return value
		}
	}
	return 0
}

func writeProviderOrStoreError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, providers.ErrProviderNotConfigured) {
		writeError(w, r, http.StatusServiceUnavailable, "provider_not_configured", "Real market data provider is not configured.")
		return
	}
	if errors.Is(err, store.ErrBadTicker) {
		writeStoreError(w, r, err)
		return
	}
	writeError(w, r, http.StatusBadGateway, "provider_error", "Real market data provider could not complete the request.")
}

func writeStoreError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, store.ErrNotFound):
		writeError(w, r, http.StatusNotFound, "not_found", "The requested resource was not found.")
	case errors.Is(err, store.ErrBadTicker):
		writeError(w, r, http.StatusBadRequest, "unknown_asset", "The asset ticker could not be resolved by the real provider.")
	case errors.Is(err, store.ErrConflict):
		writeError(w, r, http.StatusConflict, "conflict", "The resource already exists.")
	default:
		writeError(w, r, http.StatusInternalServerError, "internal_error", "The request could not be completed.")
	}
}

func phase4Meta() map[string]any {
	return map[string]any{
		"provider":   "real-provider",
		"freshness":  "provider-reported",
		"capturedAt": time.Now().UTC().Format(time.RFC3339),
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
