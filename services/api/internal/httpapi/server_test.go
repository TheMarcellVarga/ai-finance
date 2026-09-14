package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/marcellvarga/ai-finance/services/api/internal/auth"
	"github.com/marcellvarga/ai-finance/services/api/internal/providers"
)

type fakeProvider struct{}

type globalAssetProvider struct{ fakeProvider }

type marketMonitorProvider struct{}

func (marketMonitorProvider) LoadMarketMonitor(_ context.Context, assetClass string) (providers.MarketMonitorPayload, error) {
	return providers.MarketMonitorPayload{
		Data: []providers.MarketMonitorRow{{
			Symbol:               "AAPL",
			Name:                 "Apple",
			Price:                195.27,
			DisplayValue:         "$195.27",
			DailyChangePercent:   0.42,
			MonthlyChangePercent: 3.1,
			Provider:             "free-yahoo",
			SourceURL:            "https://finance.yahoo.com/quote/AAPL",
			CapturedAt:           testFreshAt(),
		}},
		Meta: providers.MarketMonitorMeta{
			AssetClass:       assetClass,
			Label:            "Equities",
			Provider:         "yahoo",
			ProviderLabel:    "Yahoo Finance public chart data",
			FreeAPI:          true,
			CapturedAt:       testFreshAt(),
			RequestedMarkets: 1,
			ReturnedMarkets:  1,
			Coverage:         "Global listed sample",
			QuoteConvention:  "Provider-listed quote",
			Freshness:        "Public delayed data",
			FailureReasons:   []string{},
			AvailableClasses: []providers.MarketMonitorClassSummary{{ID: "equities", Label: "Equities"}},
		},
	}, nil
}

func (globalAssetProvider) SearchAssets(_ context.Context, _ string) ([]providers.AssetProfile, error) {
	return []providers.AssetProfile{
		{Ticker: "7203.T", Name: "Toyota Motor Corporation", Exchange: "TSE", Type: "equity", AssetClass: "equity", CountryCode: "JP", Region: "asia", Currency: "JPY", FreshAt: testFreshAt(), Provider: "global-test"},
		{Ticker: "BND", Name: "Global Bond Fund", Exchange: "NYSE", Type: "bond", AssetClass: "bond", CountryCode: "US", Region: "americas", Currency: "USD", FreshAt: testFreshAt(), Provider: "global-test"},
	}, nil
}

func (fakeProvider) SearchAssets(_ context.Context, query string) ([]providers.AssetProfile, error) {
	return []providers.AssetProfile{
		{Ticker: "AAPL", Name: "Apple Inc.", Exchange: "NASDAQ", Type: "equity", Sector: "Technology", FreshAt: testFreshAt(), Provider: "test-provider"},
		{Ticker: "MSFT", Name: "Microsoft Corporation", Exchange: "NASDAQ", Type: "equity", Sector: "Technology", FreshAt: testFreshAt(), Provider: "test-provider"},
		{Ticker: "NVDA", Name: "NVIDIA Corporation", Exchange: "NASDAQ", Type: "equity", Sector: "Technology", FreshAt: testFreshAt(), Provider: "test-provider"},
	}, nil
}

func (fakeProvider) LatestQuote(_ context.Context, ticker string) (providers.QuoteSnapshot, error) {
	return providers.QuoteSnapshot{
		Ticker:        ticker,
		PriceCents:    19527,
		DisplayPrice:  "$195.27",
		DailyChangeBp: 42,
		Timestamp:     testFreshAt(),
		Provider:      "test-provider",
		Freshness:     "provider-reported",
	}, nil
}

func (fakeProvider) IntradayPrices(_ context.Context, ticker string, _ string, _ int) ([]providers.IntradayPoint, error) {
	return []providers.IntradayPoint{
		{Timestamp: testFreshAt().Add(-10 * time.Minute), CloseCents: 19400, DisplayClose: "$194.00", Volume: 1000, Provider: "test-provider"},
		{Timestamp: testFreshAt().Add(-5 * time.Minute), CloseCents: 19500, DisplayClose: "$195.00", Volume: 1200, Provider: "test-provider"},
		{Timestamp: testFreshAt(), CloseCents: 19527, DisplayClose: "$195.27", Volume: 1300, Provider: "test-provider"},
	}, nil
}

func testFreshAt() time.Time {
	return time.Date(2026, 5, 23, 12, 0, 0, 0, time.UTC)
}

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
		AssetProvider: fakeProvider{},
		QuoteProvider: fakeProvider{},
		ChartProvider: fakeProvider{},
		Logger:        slog.New(slog.NewTextHandler(io.Discard, nil)),
	})
}

func TestMarketMonitorEndpointUsesFreeProviderContract(t *testing.T) {
	authenticator, err := auth.NewAuthenticator(auth.Config{Mode: "dev", Env: "test", DevPrefix: "dev:"}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	if err != nil {
		t.Fatal(err)
	}
	handler := NewHandler(Options{Authenticator: authenticator, MarketMonitor: marketMonitorProvider{}, Logger: slog.New(slog.NewTextHandler(io.Discard, nil))})

	req := httptest.NewRequest(http.MethodGet, "/v1/market-monitors/equities", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", res.Code, res.Body.String())
	}
	if got := res.Body.String(); !contains(got, `"freeApi":true`) || !contains(got, `"symbol":"AAPL"`) || !contains(got, `"provider":"free-yahoo"`) {
		t.Fatalf("expected free market monitor payload, got %s", got)
	}
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

func TestAssetSearchUsesRealProvider(t *testing.T) {
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

func TestAssetSearchSupportsGlobalClassAndCountryFilters(t *testing.T) {
	authenticator, err := auth.NewAuthenticator(auth.Config{Mode: "dev", Env: "test", DevPrefix: "dev:"}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	if err != nil {
		t.Fatal(err)
	}
	handler := NewHandler(Options{
		Authenticator: authenticator,
		AssetProvider: globalAssetProvider{},
		QuoteProvider: globalAssetProvider{},
		ChartProvider: globalAssetProvider{},
		Logger:        slog.New(slog.NewTextHandler(io.Discard, nil)),
	})

	req := httptest.NewRequest(http.MethodGet, "/v1/assets/search?q=7203.T&assetClass=equity&countryCode=jp&currency=jpy&limit=5", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", res.Code, res.Body.String())
	}
	if got := res.Body.String(); !contains(got, `"ticker":"7203.T"`) || !contains(got, `"assetClass":"equity"`) || !contains(got, `"countryCode":"JP"`) || !contains(got, `"currency":"JPY"`) {
		t.Fatalf("expected normalized global metadata, got %s", got)
	}
}

func TestAssetCatalogExposesBroadTaxonomy(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/v1/assets/catalog", nil)
	res := httptest.NewRecorder()
	testHandler(t).ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", res.Code, res.Body.String())
	}
	if got := res.Body.String(); !contains(got, `"assetClasses"`) || !contains(got, `"allCodesAccepted":true`) || !contains(got, `"ISO 3166-1 alpha-2"`) {
		t.Fatalf("expected global catalog metadata, got %s", got)
	}
}

func TestIntradayChartUsesRealProvider(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/v1/assets/AAPL/intraday?interval=5min", nil)
	res := httptest.NewRecorder()

	testHandler(t).ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", res.Code, res.Body.String())
	}
	if got := res.Body.String(); !contains(got, `"provider":"test-provider"`) || !contains(got, `"displayClose":"$195.27"`) {
		t.Fatalf("expected provider chart points, got %s", got)
	}
}

func TestPortfolioGoldenPathIsOwnerScoped(t *testing.T) {
	handler := testHandler(t)

	createReq := httptest.NewRequest(http.MethodPost, "/v1/portfolios", bytes.NewBufferString(`{"name":"Real research portfolio","baseCurrency":"USD","initialHoldings":[{"ticker":"AAPL","quantity":12,"averageCostCents":19000}]}`))
	createReq.Header.Set("Authorization", "Bearer dev:user_owner")
	createRes := httptest.NewRecorder()

	handler.ServeHTTP(createRes, createReq)

	if createRes.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", createRes.Code, createRes.Body.String())
	}

	var created struct {
		Data struct {
			ID       string `json:"id"`
			Holdings []struct {
				Asset struct {
					Ticker string `json:"ticker"`
				} `json:"asset"`
			} `json:"holdings"`
			Summary struct {
				DisplayTotalValue string `json:"displayTotalValue"`
				HoldingCount      int    `json:"holdingCount"`
			} `json:"summary"`
		} `json:"data"`
	}
	if err := json.Unmarshal(createRes.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.Data.ID == "" {
		t.Fatalf("expected portfolio id in response")
	}
	if created.Data.Summary.HoldingCount == 0 || created.Data.Summary.DisplayTotalValue == "" {
		t.Fatalf("expected provider holdings and summary, got %#v", created.Data.Summary)
	}

	ownerReq := httptest.NewRequest(http.MethodGet, "/v1/portfolios/"+created.Data.ID, nil)
	ownerReq.Header.Set("Authorization", "Bearer dev:user_owner")
	ownerRes := httptest.NewRecorder()
	handler.ServeHTTP(ownerRes, ownerReq)
	if ownerRes.Code != http.StatusOK {
		t.Fatalf("owner expected 200, got %d: %s", ownerRes.Code, ownerRes.Body.String())
	}

	otherReq := httptest.NewRequest(http.MethodGet, "/v1/portfolios/"+created.Data.ID, nil)
	otherReq.Header.Set("Authorization", "Bearer dev:user_other")
	otherRes := httptest.NewRecorder()
	handler.ServeHTTP(otherRes, otherReq)
	if otherRes.Code != http.StatusNotFound {
		t.Fatalf("other user expected 404, got %d: %s", otherRes.Code, otherRes.Body.String())
	}
}

func TestHoldingAndWatchlistMutationsUseProviderAssets(t *testing.T) {
	handler := testHandler(t)

	createReq := httptest.NewRequest(http.MethodPost, "/v1/portfolios", bytes.NewBufferString(`{"name":"Research","initialHoldings":[]}`))
	createReq.Header.Set("Authorization", "Bearer dev:user_portfolio")
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusCreated {
		t.Fatalf("expected portfolio 201, got %d: %s", createRes.Code, createRes.Body.String())
	}
	var created struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(createRes.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}

	holdingReq := httptest.NewRequest(http.MethodPost, "/v1/portfolios/"+created.Data.ID+"/holdings", bytes.NewBufferString(`{"ticker":"AAPL","quantity":12,"averageCostCents":19000}`))
	holdingReq.Header.Set("Authorization", "Bearer dev:user_portfolio")
	holdingRes := httptest.NewRecorder()
	handler.ServeHTTP(holdingRes, holdingReq)
	if holdingRes.Code != http.StatusOK {
		t.Fatalf("expected holding 200, got %d: %s", holdingRes.Code, holdingRes.Body.String())
	}
	if got := holdingRes.Body.String(); !contains(got, `"ticker":"AAPL"`) || !contains(got, `"displayValue"`) {
		t.Fatalf("expected AAPL holding with market value, got %s", got)
	}

	watchlistReq := httptest.NewRequest(http.MethodPost, "/v1/watchlists", bytes.NewBufferString(`{"name":"AI infrastructure","initialAssets":["AAPL","MSFT"]}`))
	watchlistReq.Header.Set("Authorization", "Bearer dev:user_portfolio")
	watchlistRes := httptest.NewRecorder()
	handler.ServeHTTP(watchlistRes, watchlistReq)
	if watchlistRes.Code != http.StatusCreated {
		t.Fatalf("expected watchlist 201, got %d: %s", watchlistRes.Code, watchlistRes.Body.String())
	}
	if got := watchlistRes.Body.String(); !contains(got, `"freshness":"provider-reported"`) {
		t.Fatalf("expected freshness metadata, got %s", got)
	}
}

func TestFreePlanPortfolioLimitIsEnforced(t *testing.T) {
	handler := testHandler(t)

	firstReq := httptest.NewRequest(http.MethodPost, "/v1/portfolios", bytes.NewBufferString(`{"name":"First","initialHoldings":[]}`))
	firstReq.Header.Set("Authorization", "Bearer dev:user_limit")
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusCreated {
		t.Fatalf("expected first portfolio 201, got %d: %s", firstRes.Code, firstRes.Body.String())
	}

	secondReq := httptest.NewRequest(http.MethodPost, "/v1/portfolios", bytes.NewBufferString(`{"name":"Second","initialHoldings":[]}`))
	secondReq.Header.Set("Authorization", "Bearer dev:user_limit")
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusPaymentRequired {
		t.Fatalf("expected portfolio limit 402, got %d: %s", secondRes.Code, secondRes.Body.String())
	}
	if got := secondRes.Body.String(); !contains(got, "entitlement_limit_reached") {
		t.Fatalf("expected entitlement error, got %s", got)
	}
}

func TestUsageReportsServerSideLimits(t *testing.T) {
	handler := testHandler(t)

	createReq := httptest.NewRequest(http.MethodPost, "/v1/watchlists", bytes.NewBufferString(`{"name":"Research","initialAssets":["AAPL"]}`))
	createReq.Header.Set("Authorization", "Bearer dev:user_usage")
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusCreated {
		t.Fatalf("expected watchlist 201, got %d: %s", createRes.Code, createRes.Body.String())
	}

	usageReq := httptest.NewRequest(http.MethodGet, "/v1/usage", nil)
	usageReq.Header.Set("Authorization", "Bearer dev:user_usage")
	usageRes := httptest.NewRecorder()
	handler.ServeHTTP(usageRes, usageReq)
	if usageRes.Code != http.StatusOK {
		t.Fatalf("expected usage 200, got %d: %s", usageRes.Code, usageRes.Body.String())
	}
	if got := usageRes.Body.String(); !contains(got, `"feature":"watchlist"`) || !contains(got, `"used":1`) || !contains(got, `"limit":1`) {
		t.Fatalf("expected usage limits in response, got %s", got)
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
