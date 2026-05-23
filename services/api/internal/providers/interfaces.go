package providers

import (
	"context"
	"time"
)

type AssetProfile struct {
	Ticker   string
	Name     string
	Exchange string
	Type     string
	Sector   string
	CIK      string
	FreshAt  time.Time
	Provider string
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
