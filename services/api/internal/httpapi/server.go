package httpapi

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	assetcatalog "github.com/marcellvarga/ai-finance/services/api/internal/assets"
	"github.com/marcellvarga/ai-finance/services/api/internal/auth"
	"github.com/marcellvarga/ai-finance/services/api/internal/flipdigest"
	"github.com/marcellvarga/ai-finance/services/api/internal/providers"
	"github.com/marcellvarga/ai-finance/services/api/internal/research"
	"github.com/marcellvarga/ai-finance/services/api/internal/store"
)

type Options struct {
	Authenticator       *auth.Authenticator
	AssetProvider       providers.AssetSearchProvider
	QuoteProvider       providers.QuoteProvider
	ChartProvider       providers.IntradayProvider
	MarketMonitor       providers.MarketMonitorProvider
	Workspace           store.WorkspaceRepository
	FlipDigests         flipdigest.Repository
	FlipDigestJobSecret string
	Research            research.Store
	ResearchEmbedder    research.Embedder
	DocumentStore       research.ObjectStorage
	Logger              *slog.Logger
}

type server struct {
	auth                *auth.Authenticator
	assetProvider       providers.AssetSearchProvider
	quoteProvider       providers.QuoteProvider
	chartProvider       providers.IntradayProvider
	marketMonitor       providers.MarketMonitorProvider
	workspace           store.WorkspaceRepository
	flipDigests         flipdigest.Repository
	flipDigestJobSecret string
	research            research.Store
	retriever           research.Retriever
	documentStore       research.ObjectStorage
	logger              *slog.Logger
	rateLimiter         *rateLimiter
}

func NewHandler(opts Options) http.Handler {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	if opts.Workspace == nil {
		opts.Workspace = store.NewWorkspaceStore()
	}
	if opts.FlipDigests == nil {
		opts.FlipDigests = flipdigest.NewMemoryStore()
	}
	if opts.FlipDigestJobSecret == "" {
		opts.FlipDigestJobSecret = os.Getenv("FLIP_DIGEST_JOB_SECRET")
	}

	s := &server{
		auth:                opts.Authenticator,
		assetProvider:       opts.AssetProvider,
		quoteProvider:       opts.QuoteProvider,
		chartProvider:       opts.ChartProvider,
		marketMonitor:       opts.MarketMonitor,
		workspace:           opts.Workspace,
		flipDigests:         opts.FlipDigests,
		flipDigestJobSecret: opts.FlipDigestJobSecret,
		research:            opts.Research,
		retriever:           research.Retriever{Store: opts.Research, Embedder: opts.ResearchEmbedder},
		documentStore:       opts.DocumentStore,
		logger:              opts.Logger,
		rateLimiter:         newRateLimiter(30, time.Minute),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /v1/health", s.health)
	mux.HandleFunc("GET /v1/assets/search", s.searchAssets)
	mux.HandleFunc("GET /v1/assets/catalog", s.assetCatalog)
	mux.HandleFunc("GET /v1/assets/{ticker}/quote", s.quoteAsset)
	mux.HandleFunc("GET /v1/assets/{ticker}/intraday", s.intradayAsset)
	mux.HandleFunc("GET /v1/market-monitors/{class}", s.marketMonitorData)
	mux.Handle("GET /v1/me", s.requireAuth(http.HandlerFunc(s.me)))
	mux.Handle("GET /v1/usage", s.requireAuth(http.HandlerFunc(s.usage)))
	mux.Handle("GET /v1/flip-digest/preferences", s.requireAuth(http.HandlerFunc(s.getFlipDigestPreferences)))
	mux.Handle("PUT /v1/flip-digest/preferences", s.requireAuth(http.HandlerFunc(s.putFlipDigestPreferences)))
	mux.Handle("GET /v1/flip-digest/notifications", s.requireAuth(http.HandlerFunc(s.listFlipDigestNotifications)))
	mux.HandleFunc("GET /v1/internal/flip-digest/subscribers", s.flipDigestSubscribers)
	mux.HandleFunc("GET /v1/internal/flip-digest/pending-emails", s.flipDigestPendingEmails)
	mux.HandleFunc("POST /v1/internal/flip-digest/notifications", s.createFlipDigestNotification)
	mux.HandleFunc("POST /v1/internal/flip-digest/notifications/{id}/email-sent", s.markFlipDigestEmailSent)
	mux.Handle("GET /v1/portfolios", s.requireAuth(http.HandlerFunc(s.listPortfolios)))
	mux.Handle("POST /v1/portfolios", s.requireAuth(http.HandlerFunc(s.createPortfolio)))
	mux.Handle("GET /v1/portfolios/{id}", s.requireAuth(http.HandlerFunc(s.getPortfolio)))
	mux.Handle("PATCH /v1/portfolios/{id}", s.requireAuth(http.HandlerFunc(s.updatePortfolio)))
	mux.Handle("DELETE /v1/portfolios/{id}", s.requireAuth(http.HandlerFunc(s.deletePortfolio)))
	mux.Handle("POST /v1/portfolios/{id}/holdings", s.requireAuth(http.HandlerFunc(s.addHolding)))
	mux.Handle("GET /v1/watchlists", s.requireAuth(http.HandlerFunc(s.listWatchlists)))
	mux.Handle("POST /v1/watchlists", s.requireAuth(http.HandlerFunc(s.createWatchlist)))
	mux.Handle("POST /v1/watchlists/{id}/items", s.requireAuth(http.HandlerFunc(s.addWatchlistItem)))
	mux.Handle("GET /v1/research/workspaces", s.requireAuth(http.HandlerFunc(s.listResearchWorkspaces)))
	mux.Handle("POST /v1/research/workspaces", s.requireAuth(http.HandlerFunc(s.createResearchWorkspace)))
	mux.Handle("GET /v1/research/workspaces/{workspaceID}", s.requireAuth(http.HandlerFunc(s.getResearchWorkspace)))
	mux.Handle("GET /v1/research/workspaces/{workspaceID}/documents", s.requireAuth(http.HandlerFunc(s.listResearchDocuments)))
	mux.Handle("POST /v1/research/workspaces/{workspaceID}/documents", s.requireAuth(http.HandlerFunc(s.uploadResearchDocument)))
	mux.Handle("POST /v1/research/workspaces/{workspaceID}/search", s.requireAuth(http.HandlerFunc(s.searchResearchEvidence)))
	mux.Handle("GET /v1/research/workspaces/{workspaceID}/analysis-runs/{runID}/review-events", s.requireAuth(http.HandlerFunc(s.listResearchAnalysisReviewEvents)))
	mux.Handle("POST /v1/research/workspaces/{workspaceID}/analysis-runs/{runID}/review-events", s.requireAuth(http.HandlerFunc(s.appendResearchAnalysisReviewEvent)))
	mux.Handle("GET /v1/research/workspaces/{workspaceID}/documents/{documentID}", s.requireAuth(http.HandlerFunc(s.getResearchDocument)))
	mux.Handle("POST /v1/research/workspaces/{workspaceID}/documents/{documentID}/retry", s.requireAuth(http.HandlerFunc(s.retryResearchDocument)))
	mux.Handle("GET /v1/research/workspaces/{workspaceID}/documents/{documentID}/pages", s.requireAuth(http.HandlerFunc(s.listResearchDocumentPages)))

	var handler http.Handler = mux
	if opts.Research == nil {
		handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, "/v1/research/") {
				writeError(w, r, http.StatusServiceUnavailable, "research_disabled", "Document research is unavailable in this deployment.")
				return
			}
			mux.ServeHTTP(w, r)
		})
	}
	return requestID(accessLog(opts.Logger, handler))
}

func (s *server) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":    "ok",
		"service":   "finance-api",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

func (s *server) searchAssets(w http.ResponseWriter, r *http.Request) {
	if allowed, resetAt := s.rateLimiter.Allow("public-asset-search:" + strings.TrimSpace(r.RemoteAddr)); !allowed {
		writeJSON(w, http.StatusTooManyRequests, map[string]any{
			"error": map[string]any{
				"code":      "rate_limited",
				"message":   "Asset search is temporarily rate-limited.",
				"requestId": RequestID(r.Context()),
				"resetAt":   resetAt.UTC().Format(time.RFC3339),
			},
		})
		return
	}
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	filters := providers.AssetSearchFilters{
		Query:       query,
		AssetClass:  normalizeOptionalAssetClass(r.URL.Query().Get("assetClass")),
		CountryCode: assetcatalog.NormalizeCountryCode(firstNonEmptyString(r.URL.Query().Get("countryCode"), r.URL.Query().Get("country"))),
		Region:      assetcatalog.NormalizeRegion(r.URL.Query().Get("region")),
		Currency:    assetcatalog.NormalizeCurrencyCode(r.URL.Query().Get("currency")),
		Exchange:    strings.TrimSpace(r.URL.Query().Get("exchange")),
		Limit:       normalizeAssetSearchLimit(r.URL.Query().Get("limit")),
	}
	if s.assetProvider == nil {
		writeError(w, r, http.StatusServiceUnavailable, "provider_not_configured", "Real asset search provider is not configured.")
		return
	}
	var profiles []providers.AssetProfile
	var err error
	if filteredProvider, ok := s.assetProvider.(providers.FilteredAssetSearchProvider); ok {
		profiles, err = filteredProvider.SearchAssetsWithFilters(r.Context(), filters)
	} else {
		profiles, err = s.assetProvider.SearchAssets(r.Context(), query)
	}
	if err != nil {
		writeError(w, r, http.StatusBadGateway, "provider_error", "Real asset search provider could not complete the request.")
		return
	}
	results := make([]store.Asset, 0, minInt(len(profiles), filters.Limit))
	for _, profile := range profiles {
		if !matchesAssetFilters(profile, filters) {
			continue
		}
		results = append(results, assetFromProfile(profile, providers.QuoteSnapshot{}))
		if len(results) >= filters.Limit {
			break
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data": results,
		"meta": map[string]any{
			"query":       query,
			"assetClass":  filters.AssetClass,
			"countryCode": filters.CountryCode,
			"region":      filters.Region,
			"currency":    filters.Currency,
			"exchange":    filters.Exchange,
			"provider":    "real-provider",
			"freshness":   "provider-reported",
			"coverage":    "provider-backed-global",
		},
	})
}

func (s *server) assetCatalog(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"assetClasses": assetcatalog.AssetClasses(),
			"regions":      assetcatalog.RegionOptions(),
			"countryCoverage": map[string]any{
				"standard":            "ISO 3166-1 alpha-2",
				"acceptedCodePattern": "^[A-Z]{2}$",
				"allCodesAccepted":    true,
				"scope":               "Every country and territory returned by the configured market-data provider",
			},
			"currencyStandard": "ISO 4217 alpha-3",
		},
		"meta": map[string]any{
			"provider":   "application-catalog",
			"freshness":  "versioned",
			"capturedAt": time.Now().UTC().Format(time.RFC3339),
		},
	})
}

func (s *server) marketMonitorData(w http.ResponseWriter, r *http.Request) {
	if s.marketMonitor == nil {
		writeError(w, r, http.StatusServiceUnavailable, "provider_not_configured", "Free market monitor data is not configured.")
		return
	}
	payload, err := s.marketMonitor.LoadMarketMonitor(r.Context(), r.PathValue("class"))
	if err != nil {
		if strings.Contains(err.Error(), "unknown market monitor class") {
			writeError(w, r, http.StatusNotFound, "unknown_monitor_class", "That asset-class monitor is not available.")
			return
		}
		writeError(w, r, http.StatusBadGateway, "market_monitor_unavailable", "The free public market monitor could not complete the request.")
		return
	}
	writeJSON(w, http.StatusOK, payload)
}

func normalizeAssetSearchLimit(value string) int {
	limit, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || limit <= 0 {
		return 20
	}
	if limit > 50 {
		return 50
	}
	return limit
}

func normalizeOptionalAssetClass(value string) string {
	if strings.TrimSpace(value) == "" {
		return ""
	}
	return assetcatalog.NormalizeAssetClass(value)
}

func minInt(left, right int) int {
	if left < right {
		return left
	}
	return right
}

func matchesAssetFilters(profile providers.AssetProfile, filters providers.AssetSearchFilters) bool {
	assetClass := assetcatalog.NormalizeAssetClass(firstNonEmptyString(profile.AssetClass, profile.Type))
	if filters.AssetClass != "" && assetClass != filters.AssetClass {
		return false
	}
	if filters.CountryCode != "" {
		profileCountry := assetcatalog.NormalizeCountryCode(profile.CountryCode)
		if profileCountry != filters.CountryCode && !strings.EqualFold(strings.TrimSpace(profile.Country), filters.CountryCode) {
			return false
		}
	}
	if filters.Region != "" && !strings.EqualFold(strings.TrimSpace(profile.Region), filters.Region) {
		return false
	}
	if filters.Currency != "" && assetcatalog.NormalizeCurrencyCode(profile.Currency) != filters.Currency {
		return false
	}
	if filters.Exchange != "" && !strings.EqualFold(strings.TrimSpace(profile.Exchange), filters.Exchange) {
		return false
	}
	return true
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
	portfolioCount, err := s.workspace.CountPortfolios(r.Context(), principal.ClerkUserID)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	holdingCount, err := s.workspace.CountHoldings(r.Context(), principal.ClerkUserID)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	watchlistCount, err := s.workspace.CountWatchlists(r.Context(), principal.ClerkUserID)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"clerkUserId": principal.ClerkUserID,
			"period":      time.Now().UTC().Format("2006-01"),
			"plan":        freeEntitlements.Plan,
			"features": []map[string]any{
				{"feature": "portfolio", "used": portfolioCount, "limit": freeEntitlements.Portfolios, "status": "enforced"},
				{"feature": "holding", "used": holdingCount, "limit": freeEntitlements.Holdings, "status": "enforced"},
				{"feature": "watchlist", "used": watchlistCount, "limit": freeEntitlements.Watchlists, "status": "enforced"},
				{"feature": "portfolio_brief", "used": 0, "limit": freeEntitlements.AIBriefs, "status": "nextjs_metered"},
			},
		},
	})
}

func (s *server) listPortfolios(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	portfolios, err := s.workspace.ListPortfolios(r.Context(), principal.ClerkUserID)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data": portfolios,
		"meta": phase4Meta(),
	})
}

func (s *server) createPortfolio(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	portfolioCount, err := s.workspace.CountPortfolios(r.Context(), principal.ClerkUserID)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	if portfolioCount >= freeEntitlements.Portfolios {
		writeError(w, r, http.StatusPaymentRequired, "entitlement_limit_reached", "The current plan portfolio limit has been reached.")
		return
	}
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
	portfolio, err := s.workspace.CreatePortfolio(r.Context(), principal.ClerkUserID, body.Name, body.BaseCurrency, initialHoldings)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	s.writeAudit(r, principal, "portfolio.created", "portfolio", portfolio.ID, map[string]any{"plan": freeEntitlements.Plan})
	writeJSON(w, http.StatusCreated, map[string]any{"data": portfolio, "meta": phase4Meta()})
}

func (s *server) getPortfolio(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	portfolio, err := s.workspace.GetPortfolio(r.Context(), principal.ClerkUserID, r.PathValue("id"))
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
	portfolio, err := s.workspace.UpdatePortfolio(r.Context(), principal.ClerkUserID, r.PathValue("id"), body.Name, body.BaseCurrency)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	s.writeAudit(r, principal, "portfolio.updated", "portfolio", portfolio.ID, map[string]any{"plan": freeEntitlements.Plan})
	writeJSON(w, http.StatusOK, map[string]any{"data": portfolio, "meta": phase4Meta()})
}

func (s *server) deletePortfolio(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	if err := s.workspace.DeletePortfolio(r.Context(), principal.ClerkUserID, r.PathValue("id")); err != nil {
		writeStoreError(w, r, err)
		return
	}
	s.writeAudit(r, principal, "portfolio.deleted", "portfolio", r.PathValue("id"), map[string]any{"plan": freeEntitlements.Plan})
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
	hasHolding, err := s.workspace.HasHolding(r.Context(), principal.ClerkUserID, r.PathValue("id"), body.Ticker)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	holdingCount, err := s.workspace.CountHoldings(r.Context(), principal.ClerkUserID)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	if !hasHolding && holdingCount >= freeEntitlements.Holdings {
		writeError(w, r, http.StatusPaymentRequired, "entitlement_limit_reached", "The current plan holding limit has been reached.")
		return
	}
	asset, err := s.realAsset(r, body.Ticker)
	if err != nil {
		s.logger.Warn("real asset lookup failed", "ticker", body.Ticker, "error", err)
		writeProviderOrStoreError(w, r, err)
		return
	}
	portfolio, err := s.workspace.AddHolding(r.Context(), principal.ClerkUserID, r.PathValue("id"), asset, body.Quantity, body.AverageCostCents, body.Notes)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	s.writeAudit(r, principal, "holding.upserted", "portfolio", portfolio.ID, map[string]any{"ticker": asset.Ticker, "plan": freeEntitlements.Plan})
	writeJSON(w, http.StatusOK, map[string]any{"data": portfolio, "meta": phase4Meta()})
}

func (s *server) listWatchlists(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	watchlists, err := s.workspace.ListWatchlists(r.Context(), principal.ClerkUserID)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data": watchlists,
		"meta": phase4Meta(),
	})
}

func (s *server) createWatchlist(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	watchlistCount, err := s.workspace.CountWatchlists(r.Context(), principal.ClerkUserID)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	if watchlistCount >= freeEntitlements.Watchlists {
		writeError(w, r, http.StatusPaymentRequired, "entitlement_limit_reached", "The current plan watchlist limit has been reached.")
		return
	}
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
	watchlist, err := s.workspace.CreateWatchlist(r.Context(), principal.ClerkUserID, body.Name, initialAssets)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	s.writeAudit(r, principal, "watchlist.created", "watchlist", watchlist.ID, map[string]any{"plan": freeEntitlements.Plan})
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
	watchlist, err := s.workspace.AddWatchlistItem(r.Context(), principal.ClerkUserID, r.PathValue("id"), asset, body.Notes)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	s.writeAudit(r, principal, "watchlist_item.added", "watchlist", watchlist.ID, map[string]any{"ticker": asset.Ticker, "plan": freeEntitlements.Plan})
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
	assetClass := assetcatalog.NormalizeAssetClass(firstNonEmptyString(profile.AssetClass, profile.Type))
	currency := assetcatalog.NormalizeCurrencyCode(firstNonEmptyString(quote.Currency, profile.Currency))
	return store.Asset{
		Ticker:         strings.ToUpper(strings.TrimSpace(profile.Ticker)),
		ProviderSymbol: strings.TrimSpace(firstNonEmptyString(profile.ProviderSymbol, profile.Ticker)),
		Name:           strings.TrimSpace(profile.Name),
		Exchange:       strings.TrimSpace(profile.Exchange),
		Type:           assetClass,
		AssetClass:     assetClass,
		Sector:         strings.TrimSpace(profile.Sector),
		CIK:            strings.TrimSpace(profile.CIK),
		CountryCode:    assetcatalog.NormalizeCountryCode(profile.CountryCode),
		Country:        strings.TrimSpace(profile.Country),
		Region:         assetcatalog.NormalizeRegion(profile.Region),
		Currency:       currency,
		MIC:            strings.TrimSpace(profile.MIC),
		ISIN:           strings.TrimSpace(profile.ISIN),
		CUSIP:          strings.TrimSpace(profile.CUSIP),
		FIGI:           strings.TrimSpace(profile.FIGI),
		PriceCents:     quote.PriceCents,
		CapturedAt:     capturedAt,
		Freshness:      freshness,
		Provider:       provider,
		DisplayPrice:   firstNonEmptyString(quote.DisplayPrice, profile.DisplayPrice),
		DailyChangeBp:  firstNonZeroInt(quote.DailyChangeBp, profile.DailyChangeBp),
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
