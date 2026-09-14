package providers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"strings"
	"time"

	assetcatalog "github.com/marcellvarga/ai-finance/services/api/internal/assets"
)

var ErrProviderNotConfigured = errors.New("provider not configured")

type FMPProvider struct {
	APIKey string
	Client *http.Client
}

func (p FMPProvider) SearchAssets(ctx context.Context, query string) ([]AssetProfile, error) {
	if strings.TrimSpace(p.APIKey) == "" {
		return nil, ErrProviderNotConfigured
	}
	query = strings.TrimSpace(query)
	if query == "" {
		return []AssetProfile{}, nil
	}
	if looksLikeTicker(query) {
		quote, err := p.latestQuoteRow(ctx, query)
		if err == nil && quote.Symbol != "" {
			ts := time.Now().UTC()
			if quote.Timestamp > 0 {
				ts = time.Unix(quote.Timestamp, 0).UTC()
			}
			priceCents := int64(math.Round(quote.Price * 100))
			return []AssetProfile{{
				Ticker:         strings.ToUpper(quote.Symbol),
				ProviderSymbol: strings.ToUpper(quote.Symbol),
				Name:           quote.Name,
				Exchange:       quote.Exchange,
				Type:           assetcatalog.NormalizeAssetClass(firstNonEmpty(quote.Type, "equity")),
				AssetClass:     assetcatalog.NormalizeAssetClass(firstNonEmpty(quote.Type, "equity")),
				CountryCode:    assetcatalog.NormalizeCountryCode(quote.CountryCode),
				Country:        quote.Country,
				Currency:       assetcatalog.NormalizeCurrencyCode(quote.Currency),
				PriceCents:     priceCents,
				DisplayPrice:   formatProviderMoney(priceCents),
				DailyChangeBp:  int(math.Round(quote.ChangePct * 100)),
				FreshAt:        ts,
				Provider:       "fmp",
			}}, nil
		}
	}

	endpoint := "https://financialmodelingprep.com/stable/search-name"
	values := url.Values{}
	values.Set("query", query)
	values.Set("limit", "10")
	values.Set("apikey", p.APIKey)

	var rows []struct {
		Symbol      string `json:"symbol"`
		Name        string `json:"name"`
		StockEx     string `json:"stockExchange"`
		Exchange    string `json:"exchangeShortName"`
		ExchangeAlt string `json:"exchange"`
		Type        string `json:"type"`
		Country     string `json:"country"`
		CountryCode string `json:"countryCode"`
		Currency    string `json:"currency"`
		MIC         string `json:"mic"`
		ISIN        string `json:"isin"`
		CUSIP       string `json:"cusip"`
		FIGI        string `json:"figi"`
	}
	if err := p.get(ctx, endpoint+"?"+values.Encode(), &rows); err != nil {
		return nil, err
	}

	freshAt := time.Now().UTC()
	assets := make([]AssetProfile, 0, len(rows))
	for _, row := range rows {
		ticker := strings.ToUpper(strings.TrimSpace(row.Symbol))
		if ticker == "" {
			continue
		}
		exchange := firstNonEmpty(row.Exchange, row.ExchangeAlt, row.StockEx)
		assetClass := normalizeAssetType(row.Type)
		assets = append(assets, AssetProfile{
			Ticker:         ticker,
			ProviderSymbol: ticker,
			Name:           strings.TrimSpace(row.Name),
			Exchange:       strings.TrimSpace(exchange),
			Type:           assetClass,
			AssetClass:     assetClass,
			Country:        strings.TrimSpace(row.Country),
			CountryCode:    assetcatalog.NormalizeCountryCode(row.CountryCode),
			Currency:       assetcatalog.NormalizeCurrencyCode(row.Currency),
			MIC:            strings.TrimSpace(row.MIC),
			ISIN:           strings.TrimSpace(row.ISIN),
			CUSIP:          strings.TrimSpace(row.CUSIP),
			FIGI:           strings.TrimSpace(row.FIGI),
			FreshAt:        freshAt,
			Provider:       "fmp",
		})
	}

	return assets, nil
}

func (p FMPProvider) LatestQuote(ctx context.Context, ticker string) (QuoteSnapshot, error) {
	if strings.TrimSpace(p.APIKey) == "" {
		return QuoteSnapshot{}, ErrProviderNotConfigured
	}
	ticker = strings.ToUpper(strings.TrimSpace(ticker))
	if ticker == "" {
		return QuoteSnapshot{}, fmt.Errorf("ticker is required")
	}

	row, err := p.latestQuoteRow(ctx, ticker)
	if err != nil {
		return QuoteSnapshot{}, err
	}
	if row.Price <= 0 {
		return QuoteSnapshot{}, fmt.Errorf("quote not found for %s", ticker)
	}

	ts := time.Now().UTC()
	if row.Timestamp > 0 {
		ts = time.Unix(row.Timestamp, 0).UTC()
	}
	priceCents := int64(math.Round(row.Price * 100))

	return QuoteSnapshot{
		Ticker:        strings.ToUpper(firstNonEmpty(row.Symbol, ticker)),
		PriceCents:    priceCents,
		DisplayPrice:  formatProviderMoney(priceCents),
		DailyChangeBp: int(math.Round(row.ChangePct * 100)),
		Currency:      assetcatalog.NormalizeCurrencyCode(row.Currency),
		Timestamp:     ts,
		Provider:      "fmp",
		Freshness:     "provider-reported",
	}, nil
}

type fmpQuoteRow struct {
	Symbol      string  `json:"symbol"`
	Name        string  `json:"name"`
	Price       float64 `json:"price"`
	ChangePct   float64 `json:"changePercentage"`
	Timestamp   int64   `json:"timestamp"`
	Exchange    string  `json:"exchange"`
	Type        string  `json:"type"`
	Country     string  `json:"country"`
	CountryCode string  `json:"countryCode"`
	Currency    string  `json:"currency"`
}

func (p FMPProvider) latestQuoteRow(ctx context.Context, ticker string) (fmpQuoteRow, error) {
	endpoint := "https://financialmodelingprep.com/stable/quote"
	values := url.Values{}
	values.Set("symbol", strings.ToUpper(strings.TrimSpace(ticker)))
	values.Set("apikey", p.APIKey)

	var rows []fmpQuoteRow
	if err := p.get(ctx, endpoint+"?"+values.Encode(), &rows); err != nil {
		return fmpQuoteRow{}, err
	}
	if len(rows) == 0 {
		return fmpQuoteRow{}, fmt.Errorf("quote not found for %s", ticker)
	}
	return rows[0], nil
}

func (p FMPProvider) get(ctx context.Context, endpoint string, target any) error {
	client := p.Client
	if client == nil {
		client = &http.Client{Timeout: 8 * time.Second}
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "ApertureFinancialIntelligence/0.1")

	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode == http.StatusUnauthorized || res.StatusCode == http.StatusForbidden {
		return fmt.Errorf("fmp authorization failed: %d", res.StatusCode)
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return fmt.Errorf("fmp request failed: %d", res.StatusCode)
	}

	return json.NewDecoder(res.Body).Decode(target)
}

func normalizeAssetType(value string) string {
	return assetcatalog.NormalizeAssetClass(value)
}

func looksLikeTicker(value string) bool {
	value = strings.TrimSpace(value)
	if value == "" || len(value) > 32 {
		return false
	}
	for _, char := range value {
		if (char < 'A' || char > 'Z') && (char < 'a' || char > 'z') && (char < '0' || char > '9') && char != '.' && char != '-' && char != ':' && char != '/' && char != '_' {
			return false
		}
	}
	return true
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func formatProviderMoney(cents int64) string {
	sign := ""
	if cents < 0 {
		sign = "-"
		cents = -cents
	}
	return fmt.Sprintf("%s$%d.%02d", sign, cents/100, cents%100)
}
