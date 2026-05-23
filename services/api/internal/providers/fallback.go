package providers

import "context"

type FallbackMarketProvider struct {
	Primary interface {
		AssetSearchProvider
		QuoteProvider
	}
	Secondary interface {
		AssetSearchProvider
		QuoteProvider
	}
}

func (p FallbackMarketProvider) SearchAssets(ctx context.Context, query string) ([]AssetProfile, error) {
	if p.Primary != nil {
		assets, err := p.Primary.SearchAssets(ctx, query)
		if err == nil && len(assets) > 0 {
			return assets, nil
		}
	}
	if p.Secondary != nil {
		return p.Secondary.SearchAssets(ctx, query)
	}
	return nil, ErrProviderNotConfigured
}

func (p FallbackMarketProvider) LatestQuote(ctx context.Context, ticker string) (QuoteSnapshot, error) {
	if p.Primary != nil {
		quote, err := p.Primary.LatestQuote(ctx, ticker)
		if err == nil && quote.PriceCents > 0 {
			return quote, nil
		}
	}
	if p.Secondary != nil {
		return p.Secondary.LatestQuote(ctx, ticker)
	}
	return QuoteSnapshot{}, ErrProviderNotConfigured
}
