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
	return &SeedAssetStore{assets: []Asset{}}
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
