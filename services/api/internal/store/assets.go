package store

import "strings"

type Asset struct {
	Ticker        string `json:"ticker"`
	Name          string `json:"name"`
	Exchange      string `json:"exchange"`
	Type          string `json:"type"`
	Sector        string `json:"sector,omitempty"`
	CIK           string `json:"cik,omitempty"`
	PriceCents    int64  `json:"-"`
	CapturedAt    string `json:"capturedAt,omitempty"`
	Freshness     string `json:"freshness,omitempty"`
	Provider      string `json:"provider,omitempty"`
	DisplayPrice  string `json:"displayPrice,omitempty"`
	DailyChangeBp int    `json:"dailyChangeBps,omitempty"`
}

type SeedAssetStore struct {
	assets []Asset
}

func NewSeedAssetStore() *SeedAssetStore {
	return &SeedAssetStore{assets: []Asset{
		{Ticker: "AAPL", Name: "Apple Inc.", Exchange: "NASDAQ", Type: "equity", Sector: "Technology", CIK: "0000320193", PriceCents: 19527, DisplayPrice: "$195.27", CapturedAt: "2026-05-22T21:00:00Z", Freshness: "deterministic-demo-data", Provider: "demo-seed", DailyChangeBp: 42},
		{Ticker: "MSFT", Name: "Microsoft Corporation", Exchange: "NASDAQ", Type: "equity", Sector: "Technology", CIK: "0000789019", PriceCents: 46039, DisplayPrice: "$460.39", CapturedAt: "2026-05-22T21:00:00Z", Freshness: "deterministic-demo-data", Provider: "demo-seed", DailyChangeBp: 31},
		{Ticker: "NVDA", Name: "NVIDIA Corporation", Exchange: "NASDAQ", Type: "equity", Sector: "Technology", CIK: "0001045810", PriceCents: 13557, DisplayPrice: "$135.57", CapturedAt: "2026-05-22T21:00:00Z", Freshness: "deterministic-demo-data", Provider: "demo-seed", DailyChangeBp: 118},
		{Ticker: "JPM", Name: "JPMorgan Chase & Co.", Exchange: "NYSE", Type: "equity", Sector: "Financial Services", CIK: "0000019617", PriceCents: 27112, DisplayPrice: "$271.12", CapturedAt: "2026-05-22T21:00:00Z", Freshness: "deterministic-demo-data", Provider: "demo-seed", DailyChangeBp: -18},
		{Ticker: "VTI", Name: "Vanguard Total Stock Market ETF", Exchange: "NYSEARCA", Type: "etf", Sector: "Diversified", PriceCents: 30518, DisplayPrice: "$305.18", CapturedAt: "2026-05-22T21:00:00Z", Freshness: "deterministic-demo-data", Provider: "demo-seed", DailyChangeBp: 24},
		{Ticker: "BND", Name: "Vanguard Total Bond Market ETF", Exchange: "NASDAQ", Type: "etf", Sector: "Fixed Income", PriceCents: 7244, DisplayPrice: "$72.44", CapturedAt: "2026-05-22T21:00:00Z", Freshness: "deterministic-demo-data", Provider: "demo-seed", DailyChangeBp: -5},
	}}
}

func (s *SeedAssetStore) Search(query string, limit int) []Asset {
	if limit <= 0 {
		limit = 10
	}
	query = strings.ToLower(strings.TrimSpace(query))

	var results []Asset
	for _, asset := range s.assets {
		if query == "" ||
			strings.Contains(strings.ToLower(asset.Ticker), query) ||
			strings.Contains(strings.ToLower(asset.Name), query) {
			results = append(results, asset)
		}
		if len(results) >= limit {
			return results
		}
	}
	return results
}

func (s *SeedAssetStore) ByTicker(ticker string) (Asset, bool) {
	ticker = strings.ToUpper(strings.TrimSpace(ticker))
	for _, asset := range s.assets {
		if asset.Ticker == ticker {
			return asset, true
		}
	}
	return Asset{}, false
}
