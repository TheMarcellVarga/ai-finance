package providers

import (
	"context"
	"strings"

	assetcatalog "github.com/marcellvarga/ai-finance/services/api/internal/assets"
)

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

func (p FallbackMarketProvider) SearchAssetsWithFilters(ctx context.Context, filters AssetSearchFilters) ([]AssetProfile, error) {
	providersToTry := []AssetSearchProvider{p.Primary, p.Secondary}
	var lastErr error
	for _, provider := range providersToTry {
		if provider == nil {
			continue
		}
		profiles, err := provider.SearchAssets(ctx, filters.Query)
		if err != nil {
			lastErr = err
			continue
		}
		profiles = filterProfiles(profiles, filters)
		if filters.Limit > 0 && len(profiles) > filters.Limit {
			profiles = profiles[:filters.Limit]
		}
		if len(profiles) > 0 || strings.TrimSpace(filters.Query) == "" {
			return profiles, nil
		}
	}
	if lastErr != nil {
		return nil, lastErr
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

func filterProfiles(profiles []AssetProfile, filters AssetSearchFilters) []AssetProfile {
	filtered := make([]AssetProfile, 0, len(profiles))
	for _, profile := range profiles {
		if filters.AssetClass != "" && assetcatalog.NormalizeAssetClass(firstNonEmpty(profile.AssetClass, profile.Type)) != filters.AssetClass {
			continue
		}
		if filters.CountryCode != "" && assetcatalog.NormalizeCountryCode(profile.CountryCode) != filters.CountryCode && !strings.EqualFold(strings.TrimSpace(profile.Country), filters.CountryCode) {
			continue
		}
		if filters.Region != "" && !strings.EqualFold(strings.TrimSpace(profile.Region), filters.Region) {
			continue
		}
		if filters.Currency != "" && assetcatalog.NormalizeCurrencyCode(profile.Currency) != filters.Currency {
			continue
		}
		if filters.Exchange != "" && !strings.EqualFold(strings.TrimSpace(profile.Exchange), filters.Exchange) {
			continue
		}
		filtered = append(filtered, profile)
	}
	return filtered
}
