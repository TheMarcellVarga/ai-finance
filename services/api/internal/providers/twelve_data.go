package providers

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	assetcatalog "github.com/marcellvarga/ai-finance/services/api/internal/assets"
)

type TwelveDataProvider struct {
	APIKey string
	Client *http.Client
}

var twelveCache = struct {
	sync.Mutex
	quotes   map[string]cachedTwelveQuote
	intraday map[string]cachedIntradayPoints
}{
	quotes:   map[string]cachedTwelveQuote{},
	intraday: map[string]cachedIntradayPoints{},
}

type cachedTwelveQuote struct {
	row       twelveQuoteRow
	fetchedAt time.Time
}

type cachedIntradayPoints struct {
	points    []IntradayPoint
	fetchedAt time.Time
}

func (p TwelveDataProvider) SearchAssets(ctx context.Context, query string) ([]AssetProfile, error) {
	if strings.TrimSpace(p.APIKey) == "" {
		return nil, ErrProviderNotConfigured
	}
	query = strings.TrimSpace(query)
	if query == "" {
		return []AssetProfile{}, nil
	}
	if looksLikeTicker(query) {
		quote, err := p.latestQuote(ctx, query)
		if err == nil && quote.Symbol != "" {
			closeCents, _ := decimalStringToCents(quote.Close)
			changePercent, _ := strconv.ParseFloat(strings.TrimSpace(quote.PercentChange), 64)
			return []AssetProfile{{
				Ticker:         strings.ToUpper(quote.Symbol),
				ProviderSymbol: strings.ToUpper(quote.Symbol),
				Name:           quote.Name,
				Exchange:       quote.Exchange,
				Type:           assetcatalog.NormalizeAssetClass(firstNonEmpty(quote.InstrumentType, "equity")),
				AssetClass:     assetcatalog.NormalizeAssetClass(firstNonEmpty(quote.InstrumentType, "equity")),
				CountryCode:    assetcatalog.NormalizeCountryCode(quote.CountryCode),
				Country:        quote.Country,
				Currency:       assetcatalog.NormalizeCurrencyCode(quote.Currency),
				MIC:            quote.MICCode,
				PriceCents:     closeCents,
				DisplayPrice:   formatProviderMoney(closeCents),
				DailyChangeBp:  int(math.Round(changePercent * 100)),
				FreshAt:        quoteTimestamp(quote.Timestamp),
				Provider:       "twelve-data",
			}}, nil
		}
	}

	values := url.Values{}
	values.Set("symbol", query)
	values.Set("apikey", p.APIKey)

	var payload struct {
		Data []struct {
			Symbol         string `json:"symbol"`
			Instrument     string `json:"instrument_name"`
			Exchange       string `json:"exchange"`
			Type           string `json:"instrument_type"`
			Country        string `json:"country"`
			CountryCode    string `json:"country_code"`
			Currency       string `json:"currency"`
			MICCode        string `json:"mic_code"`
			ProviderSymbol string `json:"provider_symbol"`
		} `json:"data"`
		Status  string `json:"status"`
		Message string `json:"message"`
	}
	if err := p.get(ctx, "https://api.twelvedata.com/symbol_search?"+values.Encode(), &payload); err != nil {
		return nil, err
	}
	if payload.Status == "error" {
		return nil, fmt.Errorf("twelve data search failed: %s", payload.Message)
	}

	now := time.Now().UTC()
	assets := make([]AssetProfile, 0, len(payload.Data))
	for _, row := range payload.Data {
		if strings.TrimSpace(row.Symbol) == "" {
			continue
		}
		assetClass := normalizeAssetType(row.Type)
		assets = append(assets, AssetProfile{
			Ticker:         strings.ToUpper(strings.TrimSpace(row.Symbol)),
			ProviderSymbol: firstNonEmpty(strings.TrimSpace(row.ProviderSymbol), strings.TrimSpace(row.Symbol)),
			Name:           strings.TrimSpace(row.Instrument),
			Exchange:       strings.TrimSpace(row.Exchange),
			Type:           assetClass,
			AssetClass:     assetClass,
			Country:        strings.TrimSpace(row.Country),
			CountryCode:    assetcatalog.NormalizeCountryCode(row.CountryCode),
			Currency:       assetcatalog.NormalizeCurrencyCode(row.Currency),
			MIC:            strings.TrimSpace(row.MICCode),
			FreshAt:        now,
			Provider:       "twelve-data",
		})
	}
	return assets, nil
}

func (p TwelveDataProvider) LatestQuote(ctx context.Context, ticker string) (QuoteSnapshot, error) {
	if strings.TrimSpace(p.APIKey) == "" {
		return QuoteSnapshot{}, ErrProviderNotConfigured
	}
	row, err := p.latestQuote(ctx, ticker)
	if err != nil {
		return QuoteSnapshot{}, err
	}
	closeCents, err := decimalStringToCents(row.Close)
	if err != nil || closeCents <= 0 {
		return QuoteSnapshot{}, fmt.Errorf("quote not found for %s", ticker)
	}
	changePercent, _ := strconv.ParseFloat(strings.TrimSpace(row.PercentChange), 64)
	return QuoteSnapshot{
		Ticker:        strings.ToUpper(firstNonEmpty(row.Symbol, ticker)),
		PriceCents:    closeCents,
		DisplayPrice:  formatProviderMoney(closeCents),
		DailyChangeBp: int(math.Round(changePercent * 100)),
		Currency:      assetcatalog.NormalizeCurrencyCode(row.Currency),
		Timestamp:     quoteTimestamp(row.Timestamp),
		Provider:      "twelve-data",
		Freshness:     "provider-reported",
	}, nil
}

func (p TwelveDataProvider) IntradayPrices(ctx context.Context, ticker string, interval string, limit int) ([]IntradayPoint, error) {
	if strings.TrimSpace(p.APIKey) == "" {
		return nil, ErrProviderNotConfigured
	}
	ticker = strings.ToUpper(strings.TrimSpace(ticker))
	if ticker == "" {
		return nil, fmt.Errorf("ticker is required")
	}
	interval = normalizeInterval(interval)
	if limit <= 0 || limit > 120 {
		limit = 78
	}
	cacheKey := ticker + ":" + interval + ":" + strconv.Itoa(limit)
	if points, ok := getCachedIntraday(cacheKey, 90*time.Second); ok {
		return points, nil
	}

	values := url.Values{}
	values.Set("symbol", ticker)
	values.Set("interval", interval)
	values.Set("outputsize", strconv.Itoa(limit))
	values.Set("apikey", p.APIKey)

	var payload struct {
		Meta struct {
			Symbol   string `json:"symbol"`
			Exchange string `json:"exchange"`
		} `json:"meta"`
		Values []struct {
			DateTime string `json:"datetime"`
			Close    string `json:"close"`
			Volume   string `json:"volume"`
		} `json:"values"`
		Status  string `json:"status"`
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	if err := p.get(ctx, "https://api.twelvedata.com/time_series?"+values.Encode(), &payload); err != nil {
		if points, ok := getCachedIntraday(cacheKey, 5*time.Minute); ok {
			return points, nil
		}
		return nil, err
	}
	if payload.Status == "error" || payload.Code != 0 {
		if points, ok := getCachedIntraday(cacheKey, 5*time.Minute); ok {
			return points, nil
		}
		return nil, fmt.Errorf("twelve data request failed: %s", payload.Message)
	}

	points := make([]IntradayPoint, 0, len(payload.Values))
	for i := len(payload.Values) - 1; i >= 0; i-- {
		row := payload.Values[i]
		closeCents, err := decimalStringToCents(row.Close)
		if err != nil || closeCents <= 0 {
			continue
		}
		volume, _ := strconv.ParseInt(strings.TrimSpace(row.Volume), 10, 64)
		ts, err := time.ParseInLocation("2006-01-02 15:04:05", row.DateTime, time.UTC)
		if err != nil {
			ts = time.Now().UTC()
		}
		points = append(points, IntradayPoint{
			Timestamp:    ts.UTC(),
			CloseCents:   closeCents,
			DisplayClose: formatProviderMoney(closeCents),
			Volume:       volume,
			Provider:     "twelve-data",
		})
	}

	setCachedIntraday(cacheKey, points)
	return points, nil
}

type twelveQuoteRow struct {
	Symbol         string `json:"symbol"`
	Name           string `json:"name"`
	Exchange       string `json:"exchange"`
	Close          string `json:"close"`
	PercentChange  string `json:"percent_change"`
	Timestamp      int64  `json:"timestamp"`
	InstrumentType string `json:"instrument_type"`
	Country        string `json:"country"`
	CountryCode    string `json:"country_code"`
	Currency       string `json:"currency"`
	MICCode        string `json:"mic_code"`
	Status         string `json:"status"`
	Code           int    `json:"code"`
	Message        string `json:"message"`
}

func (p TwelveDataProvider) latestQuote(ctx context.Context, ticker string) (twelveQuoteRow, error) {
	ticker = strings.ToUpper(strings.TrimSpace(ticker))
	if row, ok := getCachedQuote(ticker, 90*time.Second); ok {
		return row, nil
	}
	values := url.Values{}
	values.Set("symbol", ticker)
	values.Set("apikey", p.APIKey)

	var row twelveQuoteRow
	if err := p.get(ctx, "https://api.twelvedata.com/quote?"+values.Encode(), &row); err != nil {
		if cached, ok := getCachedQuote(ticker, 5*time.Minute); ok {
			return cached, nil
		}
		return twelveQuoteRow{}, err
	}
	if row.Status == "error" || row.Code != 0 {
		if cached, ok := getCachedQuote(ticker, 5*time.Minute); ok {
			return cached, nil
		}
		return twelveQuoteRow{}, fmt.Errorf("twelve data quote failed: %s", row.Message)
	}
	setCachedQuote(ticker, row)
	return row, nil
}

func (p TwelveDataProvider) get(ctx context.Context, endpoint string, target any) error {
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
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return fmt.Errorf("twelve data request failed: %d", res.StatusCode)
	}

	return json.NewDecoder(res.Body).Decode(target)
}

func normalizeInterval(interval string) string {
	switch strings.ToLower(strings.TrimSpace(interval)) {
	case "1min", "5min", "15min", "30min", "45min", "1h":
		return strings.ToLower(strings.TrimSpace(interval))
	default:
		return "5min"
	}
}

func decimalStringToCents(value string) (int64, error) {
	parsed, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
	if err != nil {
		return 0, err
	}
	return int64(math.Round(parsed * 100)), nil
}

func quoteTimestamp(value int64) time.Time {
	if value > 0 {
		return time.Unix(value, 0).UTC()
	}
	return time.Now().UTC()
}

func getCachedQuote(ticker string, maxAge time.Duration) (twelveQuoteRow, bool) {
	twelveCache.Lock()
	defer twelveCache.Unlock()
	cached, ok := twelveCache.quotes[ticker]
	if !ok || time.Since(cached.fetchedAt) > maxAge {
		return twelveQuoteRow{}, false
	}
	return cached.row, true
}

func setCachedQuote(ticker string, row twelveQuoteRow) {
	twelveCache.Lock()
	defer twelveCache.Unlock()
	twelveCache.quotes[ticker] = cachedTwelveQuote{row: row, fetchedAt: time.Now()}
}

func getCachedIntraday(key string, maxAge time.Duration) ([]IntradayPoint, bool) {
	twelveCache.Lock()
	defer twelveCache.Unlock()
	cached, ok := twelveCache.intraday[key]
	if !ok || time.Since(cached.fetchedAt) > maxAge {
		return nil, false
	}
	return append([]IntradayPoint(nil), cached.points...), true
}

func setCachedIntraday(key string, points []IntradayPoint) {
	twelveCache.Lock()
	defer twelveCache.Unlock()
	twelveCache.intraday[key] = cachedIntradayPoints{points: append([]IntradayPoint(nil), points...), fetchedAt: time.Now()}
}
