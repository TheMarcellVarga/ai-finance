package providers

import (
	"context"
	"time"
)

type AssetProfile struct {
	Ticker        string    `json:"ticker"`
	Name          string    `json:"name"`
	Exchange      string    `json:"exchange"`
	Type          string    `json:"type"`
	Sector        string    `json:"sector,omitempty"`
	CIK           string    `json:"cik,omitempty"`
	PriceCents    int64     `json:"priceCents,omitempty"`
	DisplayPrice  string    `json:"displayPrice,omitempty"`
	DailyChangeBp int       `json:"dailyChangeBps,omitempty"`
	FreshAt       time.Time `json:"freshAt,omitempty"`
	Provider      string    `json:"provider,omitempty"`
}

type QuoteSnapshot struct {
	Ticker        string    `json:"ticker"`
	PriceCents    int64     `json:"priceCents"`
	DisplayPrice  string    `json:"displayPrice"`
	DailyChangeBp int       `json:"dailyChangeBps,omitempty"`
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
