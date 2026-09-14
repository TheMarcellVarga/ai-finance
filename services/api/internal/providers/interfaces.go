package providers

import (
	"context"
	"time"
)

type AssetProfile struct {
	Ticker         string    `json:"ticker"`
	Name           string    `json:"name"`
	Exchange       string    `json:"exchange"`
	Type           string    `json:"type"` // Legacy alias for AssetClass.
	AssetClass     string    `json:"assetClass,omitempty"`
	Sector         string    `json:"sector,omitempty"`
	CIK            string    `json:"cik,omitempty"`
	CountryCode    string    `json:"countryCode,omitempty"`
	Country        string    `json:"country,omitempty"`
	Region         string    `json:"region,omitempty"`
	Currency       string    `json:"currency,omitempty"`
	MIC            string    `json:"mic,omitempty"`
	ISIN           string    `json:"isin,omitempty"`
	CUSIP          string    `json:"cusip,omitempty"`
	FIGI           string    `json:"figi,omitempty"`
	ProviderSymbol string    `json:"providerSymbol,omitempty"`
	PriceCents     int64     `json:"priceCents,omitempty"`
	DisplayPrice   string    `json:"displayPrice,omitempty"`
	DailyChangeBp  int       `json:"dailyChangeBps,omitempty"`
	FreshAt        time.Time `json:"freshAt,omitempty"`
	Provider       string    `json:"provider,omitempty"`
}

type QuoteSnapshot struct {
	Ticker        string    `json:"ticker"`
	PriceCents    int64     `json:"priceCents"`
	DisplayPrice  string    `json:"displayPrice"`
	DailyChangeBp int       `json:"dailyChangeBps,omitempty"`
	Currency      string    `json:"currency,omitempty"`
	Timestamp     time.Time `json:"timestamp"`
	Provider      string    `json:"provider"`
	Freshness     string    `json:"freshness"`
}

type IntradayPoint struct {
	Timestamp    time.Time `json:"timestamp"`
	CloseCents   int64     `json:"closeCents"`
	DisplayClose string    `json:"displayClose"`
	Volume       int64     `json:"volume,omitempty"`
	Provider     string    `json:"provider"`
}

type PriceSnapshot struct {
	Ticker    string
	Timestamp time.Time
	Open      string
	High      string
	Low       string
	Close     string
	Volume    int64
	Provider  string
}

type FilingDocument struct {
	Ticker     string
	CIK        string
	Accession  string
	FilingType string
	PeriodEnd  time.Time
	SourceURL  string
	FetchedAt  time.Time
	Provider   string
}

type MarketDataProvider interface {
	SearchAssets(ctx context.Context, query string) ([]AssetProfile, error)
	PriceHistory(ctx context.Context, ticker string, from time.Time, to time.Time) ([]PriceSnapshot, error)
}

type AssetSearchProvider interface {
	SearchAssets(ctx context.Context, query string) ([]AssetProfile, error)
}

// AssetSearchFilters are deliberately provider-neutral. Providers may support
// additional native filters, but the API always applies these fields again to
// the normalized result so a provider cannot accidentally broaden a request.
type AssetSearchFilters struct {
	Query       string
	AssetClass  string
	CountryCode string
	Region      string
	Currency    string
	Exchange    string
	Limit       int
}

type FilteredAssetSearchProvider interface {
	SearchAssetsWithFilters(ctx context.Context, filters AssetSearchFilters) ([]AssetProfile, error)
}

type QuoteProvider interface {
	LatestQuote(ctx context.Context, ticker string) (QuoteSnapshot, error)
}

type IntradayProvider interface {
	IntradayPrices(ctx context.Context, ticker string, interval string, limit int) ([]IntradayPoint, error)
}

type FilingsProvider interface {
	RecentFilings(ctx context.Context, ticker string, limit int) ([]FilingDocument, error)
}

type NewsProvider interface {
	Headlines(ctx context.Context, ticker string, limit int) ([]SourceHeadline, error)
}

type SourceHeadline struct {
	Title     string
	URL       string
	Publisher string
	Published time.Time
}
