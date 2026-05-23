package store

import "strings"

type Asset struct {
	Ticker   string `json:"ticker"`
	Name     string `json:"name"`
	Exchange string `json:"exchange"`
	Type     string `json:"type"`
	Sector   string `json:"sector,omitempty"`
	CIK      string `json:"cik,omitempty"`
}

type SeedAssetStore struct {
	assets []Asset
}

func NewSeedAssetStore() *SeedAssetStore {
	return &SeedAssetStore{assets: []Asset{
		{Ticker: "AAPL", Name: "Apple Inc.", Exchange: "NASDAQ", Type: "equity", Sector: "Technology", CIK: "0000320193"},
		{Ticker: "MSFT", Name: "Microsoft Corporation", Exchange: "NASDAQ", Type: "equity", Sector: "Technology", CIK: "0000789019"},
		{Ticker: "NVDA", Name: "NVIDIA Corporation", Exchange: "NASDAQ", Type: "equity", Sector: "Technology", CIK: "0001045810"},
		{Ticker: "JPM", Name: "JPMorgan Chase & Co.", Exchange: "NYSE", Type: "equity", Sector: "Financial Services", CIK: "0000019617"},
		{Ticker: "VTI", Name: "Vanguard Total Stock Market ETF", Exchange: "NYSEARCA", Type: "etf", Sector: "Diversified"},
		{Ticker: "BND", Name: "Vanguard Total Bond Market ETF", Exchange: "NASDAQ", Type: "etf", Sector: "Fixed Income"},
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
