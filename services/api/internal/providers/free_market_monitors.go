package providers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"
)

// MarketMonitorProvider is the provider boundary for the public, read-only
// asset-class monitors. It deliberately returns normalized rows so the UI can
// use the same table for direct instruments and clearly-labelled proxies.
type MarketMonitorProvider interface {
	LoadMarketMonitor(ctx context.Context, assetClass string) (MarketMonitorPayload, error)
}

type MonitorPoint struct {
	Timestamp time.Time `json:"timestamp"`
	Value     float64   `json:"value"`
}

type MarketMonitorRow struct {
	Symbol               string         `json:"symbol"`
	Name                 string         `json:"name"`
	Venue                string         `json:"venue,omitempty"`
	Currency             string         `json:"currency,omitempty"`
	Unit                 string         `json:"unit,omitempty"`
	Price                float64        `json:"price"`
	DisplayValue         string         `json:"displayValue"`
	DailyChangePercent   float64        `json:"dailyChangePercent"`
	MonthlyChangePercent float64        `json:"monthlyChangePercent"`
	Volume               float64        `json:"volume,omitempty"`
	Sparkline            []MonitorPoint `json:"sparkline"`
	Provider             string         `json:"provider"`
	SourceURL            string         `json:"sourceUrl"`
	CapturedAt           time.Time      `json:"capturedAt"`
	IsProxy              bool           `json:"isProxy,omitempty"`
	ProxyNote            string         `json:"proxyNote,omitempty"`
}

type MarketMonitorClassSummary struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	Description string `json:"description"`
	Coverage    string `json:"coverage"`
}

type MarketMonitorMeta struct {
	AssetClass       string                      `json:"assetClass"`
	Label            string                      `json:"label"`
	Description      string                      `json:"description"`
	Provider         string                      `json:"provider"`
	ProviderLabel    string                      `json:"providerLabel"`
	FreeAPI          bool                        `json:"freeApi"`
	CapturedAt       time.Time                   `json:"capturedAt"`
	RequestedMarkets int                         `json:"requestedMarkets"`
	ReturnedMarkets  int                         `json:"returnedMarkets"`
	FailedMarkets    int                         `json:"failedMarkets"`
	Coverage         string                      `json:"coverage"`
	QuoteConvention  string                      `json:"quoteConvention"`
	Freshness        string                      `json:"freshness"`
	FailureReasons   []string                    `json:"failureReasons"`
	AvailableClasses []MarketMonitorClassSummary `json:"availableClasses"`
}

type MarketMonitorPayload struct {
	Data []MarketMonitorRow `json:"data"`
	Meta MarketMonitorMeta  `json:"meta"`
}

type monitorInstrument struct {
	Symbol    string
	Name      string
	Unit      string
	Currency  string
	Format    string
	IsProxy   bool
	ProxyNote string
}

type monitorDefinition struct {
	ID              string
	Label           string
	Description     string
	Coverage        string
	QuoteConvention string
	Provider        string
	ProviderLabel   string
	Instruments     []monitorInstrument
}

var monitorDefinitions = []monitorDefinition{
	{
		ID:              "equities",
		Label:           "Equities",
		Description:     "Listed ownership across major developed and emerging markets.",
		Coverage:        "Global listed equity sample",
		QuoteConvention: "Provider-listed local or converted quote currency",
		Provider:        "yahoo",
		ProviderLabel:   "Yahoo Finance public chart data",
		Instruments: []monitorInstrument{
			{Symbol: "AAPL", Name: "Apple", Currency: "USD"},
			{Symbol: "MSFT", Name: "Microsoft", Currency: "USD"},
			{Symbol: "NVDA", Name: "NVIDIA", Currency: "USD"},
			{Symbol: "TSM", Name: "Taiwan Semiconductor", Currency: "USD"},
			{Symbol: "ASML", Name: "ASML Holding", Currency: "USD"},
			{Symbol: "SAP", Name: "SAP", Currency: "USD"},
			{Symbol: "7203.T", Name: "Toyota Motor", Currency: "JPY"},
			{Symbol: "0700.HK", Name: "Tencent Holdings", Currency: "HKD"},
			{Symbol: "RELIANCE.NS", Name: "Reliance Industries", Currency: "INR"},
		},
	},
	{
		ID:              "funds",
		Label:           "Funds & indexes",
		Description:     "ETFs and broad index vehicles for diversified market exposure.",
		Coverage:        "Listed ETF and index sample",
		QuoteConvention: "Listed fund or index quote in the provider currency",
		Provider:        "yahoo",
		ProviderLabel:   "Yahoo Finance public chart data",
		Instruments: []monitorInstrument{
			{Symbol: "VT", Name: "Vanguard Total World Stock ETF", Currency: "USD"},
			{Symbol: "VTI", Name: "Vanguard Total Stock Market ETF", Currency: "USD"},
			{Symbol: "SPY", Name: "SPDR S&P 500 ETF Trust", Currency: "USD"},
			{Symbol: "QQQ", Name: "Invesco QQQ Trust", Currency: "USD"},
			{Symbol: "EFA", Name: "iShares MSCI EAFE ETF", Currency: "USD"},
			{Symbol: "IEMG", Name: "iShares Core MSCI Emerging Markets ETF", Currency: "USD"},
			{Symbol: "SCHD", Name: "Schwab US Dividend Equity ETF", Currency: "USD"},
			{Symbol: "BND", Name: "Vanguard Total Bond Market ETF", Currency: "USD"},
		},
	},
	{
		ID:              "fixed-income",
		Label:           "Fixed income",
		Description:     "Listed bond funds and sovereign-duration references across the rate curve.",
		Coverage:        "Listed bond and sovereign proxy sample",
		QuoteConvention: "Listed fund price; yield and spread data are not inferred",
		Provider:        "yahoo",
		ProviderLabel:   "Yahoo Finance public chart data",
		Instruments: []monitorInstrument{
			{Symbol: "SHY", Name: "iShares 1-3 Year Treasury Bond ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed Treasury proxy"},
			{Symbol: "IEF", Name: "iShares 7-10 Year Treasury Bond ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed Treasury proxy"},
			{Symbol: "TLT", Name: "iShares 20+ Year Treasury Bond ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed Treasury proxy"},
			{Symbol: "AGG", Name: "iShares Core U.S. Aggregate Bond ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed aggregate-bond proxy"},
			{Symbol: "LQD", Name: "iShares iBoxx Investment Grade Corporate Bond ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed corporate-bond proxy"},
			{Symbol: "HYG", Name: "iShares iBoxx High Yield Corporate Bond ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed high-yield proxy"},
			{Symbol: "EMB", Name: "iShares J.P. Morgan USD Emerging Markets Bond ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed emerging-market debt proxy"},
			{Symbol: "IGOV", Name: "iShares International Treasury Bond ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed sovereign-bond proxy"},
		},
	},
	{
		ID:              "currencies",
		Label:           "Currencies",
		Description:     "Daily central-bank reference rates for major and regional currency pairs.",
		Coverage:        "98 central-bank sources and 205 currencies via Frankfurter",
		QuoteConvention: "1 USD = quoted currency units; daily reference rates",
		Provider:        "frankfurter",
		ProviderLabel:   "Frankfurter / ECB reference rates",
		Instruments: []monitorInstrument{
			{Symbol: "USD/EUR", Name: "US dollar / euro", Unit: "EUR per USD", Currency: "EUR", Format: "rate"},
			{Symbol: "USD/GBP", Name: "US dollar / pound sterling", Unit: "GBP per USD", Currency: "GBP", Format: "rate"},
			{Symbol: "USD/JPY", Name: "US dollar / Japanese yen", Unit: "JPY per USD", Currency: "JPY", Format: "rate"},
			{Symbol: "USD/CHF", Name: "US dollar / Swiss franc", Unit: "CHF per USD", Currency: "CHF", Format: "rate"},
			{Symbol: "USD/CNY", Name: "US dollar / Chinese yuan", Unit: "CNY per USD", Currency: "CNY", Format: "rate"},
			{Symbol: "USD/SGD", Name: "US dollar / Singapore dollar", Unit: "SGD per USD", Currency: "SGD", Format: "rate"},
			{Symbol: "USD/HKD", Name: "US dollar / Hong Kong dollar", Unit: "HKD per USD", Currency: "HKD", Format: "rate"},
			{Symbol: "USD/AUD", Name: "US dollar / Australian dollar", Unit: "AUD per USD", Currency: "AUD", Format: "rate"},
			{Symbol: "USD/CAD", Name: "US dollar / Canadian dollar", Unit: "CAD per USD", Currency: "CAD", Format: "rate"},
			{Symbol: "USD/INR", Name: "US dollar / Indian rupee", Unit: "INR per USD", Currency: "INR", Format: "rate"},
		},
	},
	{
		ID:              "commodities",
		Label:           "Commodities",
		Description:     "Energy, metals, and agricultural futures used as public reference prices.",
		Coverage:        "Exchange-traded futures reference sample",
		QuoteConvention: "Front contract public quote; contract roll is not normalized",
		Provider:        "yahoo",
		ProviderLabel:   "Yahoo Finance public chart data",
		Instruments: []monitorInstrument{
			{Symbol: "GC=F", Name: "Gold futures", Unit: "USD / troy oz", Currency: "USD"},
			{Symbol: "SI=F", Name: "Silver futures", Unit: "USD / troy oz", Currency: "USD"},
			{Symbol: "CL=F", Name: "WTI crude oil futures", Unit: "USD / barrel", Currency: "USD"},
			{Symbol: "NG=F", Name: "Natural gas futures", Unit: "USD / MMBtu", Currency: "USD"},
			{Symbol: "HG=F", Name: "Copper futures", Unit: "USD / lb", Currency: "USD"},
			{Symbol: "ZC=F", Name: "Corn futures", Unit: "US cents / bushel", Currency: "USD"},
			{Symbol: "ZW=F", Name: "Wheat futures", Unit: "US cents / bushel", Currency: "USD"},
			{Symbol: "KC=F", Name: "Coffee futures", Unit: "US cents / lb", Currency: "USD"},
		},
	},
	{
		ID:              "real-estate",
		Label:           "Real estate",
		Description:     "Listed REITs and property funds that make the public market slice visible.",
		Coverage:        "Listed REIT and property-fund proxy sample",
		QuoteConvention: "Listed REIT or property-fund quote; private property is not marked",
		Provider:        "yahoo",
		ProviderLabel:   "Yahoo Finance public chart data",
		Instruments: []monitorInstrument{
			{Symbol: "VNQ", Name: "Vanguard Real Estate ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed REIT proxy"},
			{Symbol: "VNQI", Name: "Vanguard Global ex-U.S. Real Estate ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed global property proxy"},
			{Symbol: "IYR", Name: "iShares U.S. Real Estate ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed property proxy"},
			{Symbol: "XLRE", Name: "Real Estate Select Sector SPDR Fund", Currency: "USD", IsProxy: true, ProxyNote: "Listed REIT proxy"},
			{Symbol: "SCHH", Name: "Schwab U.S. REIT ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed REIT proxy"},
			{Symbol: "RWX", Name: "SPDR Dow Jones International Real Estate ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed global property proxy"},
			{Symbol: "PLD", Name: "Prologis", Currency: "USD", IsProxy: true, ProxyNote: "Listed logistics property proxy"},
			{Symbol: "WELL", Name: "Welltower", Currency: "USD", IsProxy: true, ProxyNote: "Listed healthcare property proxy"},
		},
	},
	{
		ID:              "derivatives",
		Label:           "Derivatives",
		Description:     "Public futures references across equity indexes, rates, energy, and metals.",
		Coverage:        "Exchange-traded futures reference sample",
		QuoteConvention: "Front contract public quote; open interest and options greeks are not included",
		Provider:        "yahoo",
		ProviderLabel:   "Yahoo Finance public chart data",
		Instruments: []monitorInstrument{
			{Symbol: "ES=F", Name: "E-mini S&P 500 futures", Unit: "index points", Currency: "USD"},
			{Symbol: "NQ=F", Name: "E-mini Nasdaq-100 futures", Unit: "index points", Currency: "USD"},
			{Symbol: "YM=F", Name: "E-mini Dow futures", Unit: "index points", Currency: "USD"},
			{Symbol: "RTY=F", Name: "E-mini Russell 2000 futures", Unit: "index points", Currency: "USD"},
			{Symbol: "ZN=F", Name: "10-year Treasury note futures", Unit: "points", Currency: "USD"},
			{Symbol: "ZB=F", Name: "30-year Treasury bond futures", Unit: "points", Currency: "USD"},
			{Symbol: "GC=F", Name: "Gold futures", Unit: "USD / troy oz", Currency: "USD"},
			{Symbol: "CL=F", Name: "WTI crude oil futures", Unit: "USD / barrel", Currency: "USD"},
		},
	},
	{
		ID:              "private-markets",
		Label:           "Private markets",
		Description:     "Listed access vehicles used as transparent public proxies for private-market themes.",
		Coverage:        "Listed private-equity, BDC, and private-credit proxies",
		QuoteConvention: "Listed proxy price; private NAV, marks, and liquidity are not inferred",
		Provider:        "yahoo",
		ProviderLabel:   "Yahoo Finance public chart data",
		Instruments: []monitorInstrument{
			{Symbol: "PSP", Name: "Invesco Global Listed Private Equity ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed private-equity proxy"},
			{Symbol: "PEX", Name: "ProShares Global Listed Private Equity ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed private-equity proxy"},
			{Symbol: "BIZD", Name: "VanEck BDC Income ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed private-credit proxy"},
			{Symbol: "ARCC", Name: "Ares Capital", Currency: "USD", IsProxy: true, ProxyNote: "Listed BDC proxy"},
			{Symbol: "GBDC", Name: "Golub Capital BDC", Currency: "USD", IsProxy: true, ProxyNote: "Listed BDC proxy"},
			{Symbol: "MAIN", Name: "Main Street Capital", Currency: "USD", IsProxy: true, ProxyNote: "Listed BDC proxy"},
		},
	},
	{
		ID:              "cash-rates",
		Label:           "Cash & rates",
		Description:     "Short-term liquidity vehicles and Treasury curve references for cash context.",
		Coverage:        "U.S. Treasury curve and listed cash proxy sample",
		QuoteConvention: "Yield-index level or listed fund price; not a deposit rate",
		Provider:        "yahoo",
		ProviderLabel:   "Yahoo Finance public chart data",
		Instruments: []monitorInstrument{
			{Symbol: "^IRX", Name: "13-week Treasury bill yield", Unit: "% yield", Currency: "USD", Format: "percent"},
			{Symbol: "^FVX", Name: "5-year Treasury yield", Unit: "% yield", Currency: "USD", Format: "percent"},
			{Symbol: "^TNX", Name: "10-year Treasury yield", Unit: "% yield", Currency: "USD", Format: "percent"},
			{Symbol: "^TYX", Name: "30-year Treasury yield", Unit: "% yield", Currency: "USD", Format: "percent"},
			{Symbol: "SGOV", Name: "iShares 0-3 Month Treasury Bond ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed cash-management proxy"},
			{Symbol: "BIL", Name: "SPDR Bloomberg 1-3 Month T-Bill ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed cash-management proxy"},
			{Symbol: "SHV", Name: "iShares 0-1 Year Treasury Bond ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed cash-management proxy"},
		},
	},
	{
		ID:              "protection",
		Label:           "Protection & contracts",
		Description:     "Listed insurance and income proxies for contract-based asset research.",
		Coverage:        "Listed insurance and preferred-income proxy sample",
		QuoteConvention: "Listed proxy price; contract terms, guarantees, and liabilities are not inferred",
		Provider:        "yahoo",
		ProviderLabel:   "Yahoo Finance public chart data",
		Instruments: []monitorInstrument{
			{Symbol: "KIE", Name: "SPDR S&P Insurance ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed insurance proxy"},
			{Symbol: "IAK", Name: "iShares U.S. Insurance ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed insurance proxy"},
			{Symbol: "PFF", Name: "iShares Preferred and Income Securities ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed preferred-income proxy"},
			{Symbol: "PGX", Name: "Invesco Preferred ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed preferred-income proxy"},
			{Symbol: "TIP", Name: "iShares TIPS Bond ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed inflation-linked proxy"},
			{Symbol: "LQD", Name: "iShares iBoxx Investment Grade Corporate Bond ETF", Currency: "USD", IsProxy: true, ProxyNote: "Listed income proxy"},
		},
	},
}

type FreeMarketMonitorProvider struct {
	Client *http.Client
}

func (p FreeMarketMonitorProvider) LoadMarketMonitor(ctx context.Context, assetClass string) (MarketMonitorPayload, error) {
	definition, ok := findMonitorDefinition(assetClass)
	if !ok {
		return MarketMonitorPayload{}, fmt.Errorf("unknown market monitor class %q", assetClass)
	}

	var rows []MarketMonitorRow
	var failures []string
	var capturedAt time.Time
	if definition.Provider == "frankfurter" {
		rows, capturedAt, failures = p.loadFrankfurter(ctx, definition)
	} else {
		rows, capturedAt, failures = p.loadYahoo(ctx, definition)
	}
	if len(rows) == 0 {
		return MarketMonitorPayload{}, errors.New("free public market monitor returned no usable rows")
	}
	if capturedAt.IsZero() {
		capturedAt = time.Now().UTC()
	}

	return MarketMonitorPayload{
		Data: rows,
		Meta: MarketMonitorMeta{
			AssetClass:       definition.ID,
			Label:            definition.Label,
			Description:      definition.Description,
			Provider:         definition.Provider,
			ProviderLabel:    definition.ProviderLabel,
			FreeAPI:          true,
			CapturedAt:       capturedAt,
			RequestedMarkets: len(definition.Instruments),
			ReturnedMarkets:  len(rows),
			FailedMarkets:    len(failures),
			Coverage:         definition.Coverage,
			QuoteConvention:  definition.QuoteConvention,
			Freshness:        "Public delayed or daily reference data; row timestamps are retained.",
			FailureReasons:   failures,
			AvailableClasses: monitorClassSummaries(),
		},
	}, nil
}

// SearchAssets and LatestQuote let the free monitor universe participate in
// owner-scoped portfolio/watchlist flows when paid provider keys are absent.
func (p FreeMarketMonitorProvider) SearchAssets(ctx context.Context, query string) ([]AssetProfile, error) {
	query = strings.ToUpper(strings.TrimSpace(query))
	if query == "" {
		return []AssetProfile{}, nil
	}

	var matches []struct {
		definition monitorDefinition
		instrument monitorInstrument
	}
	for _, definition := range monitorDefinitions {
		for _, instrument := range definition.Instruments {
			if strings.Contains(strings.ToUpper(instrument.Symbol), query) || strings.Contains(strings.ToUpper(instrument.Name), query) {
				matches = append(matches, struct {
					definition monitorDefinition
					instrument monitorInstrument
				}{definition, instrument})
			}
		}
	}
	if len(matches) > 10 {
		matches = matches[:10]
	}

	assets := make([]AssetProfile, 0, len(matches))
	for _, match := range matches {
		row, err := p.fetchInstrument(ctx, match.definition, match.instrument)
		if err != nil {
			continue
		}
		assets = append(assets, assetProfileFromMonitorRow(row, match.definition.ID))
	}
	return assets, nil
}

func (p FreeMarketMonitorProvider) LatestQuote(ctx context.Context, ticker string) (QuoteSnapshot, error) {
	ticker = strings.ToUpper(strings.TrimSpace(ticker))
	for _, definition := range monitorDefinitions {
		for _, instrument := range definition.Instruments {
			if strings.ToUpper(instrument.Symbol) != ticker {
				continue
			}
			row, err := p.fetchInstrument(ctx, definition, instrument)
			if err != nil {
				return QuoteSnapshot{}, err
			}
			priceCents := int64(math.Round(row.Price * 100))
			return QuoteSnapshot{
				Ticker:        row.Symbol,
				PriceCents:    priceCents,
				DisplayPrice:  row.DisplayValue,
				DailyChangeBp: int(math.Round(row.DailyChangePercent * 100)),
				Currency:      row.Currency,
				Timestamp:     row.CapturedAt,
				Provider:      row.Provider,
				Freshness:     "public-delayed-or-daily",
			}, nil
		}
	}
	return QuoteSnapshot{}, fmt.Errorf("free monitor symbol %q is not configured", ticker)
}

func (p FreeMarketMonitorProvider) fetchInstrument(ctx context.Context, definition monitorDefinition, instrument monitorInstrument) (MarketMonitorRow, error) {
	if definition.Provider == "frankfurter" {
		rows, _, failures := p.loadFrankfurter(ctx, monitorDefinition{Instruments: []monitorInstrument{instrument}})
		if len(rows) == 0 {
			if len(failures) > 0 {
				return MarketMonitorRow{}, errors.New(failures[0])
			}
			return MarketMonitorRow{}, errors.New("currency reference rate unavailable")
		}
		return rows[0], nil
	}
	return p.fetchYahooInstrument(ctx, instrument)
}

func (p FreeMarketMonitorProvider) loadYahoo(ctx context.Context, definition monitorDefinition) ([]MarketMonitorRow, time.Time, []string) {
	client := p.Client
	if client == nil {
		client = &http.Client{Timeout: 12 * time.Second}
	}
	rows := make([]MarketMonitorRow, len(definition.Instruments))
	failures := make([]string, 0)
	var latest time.Time
	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, 6)

	for index, instrument := range definition.Instruments {
		wg.Add(1)
		go func(index int, instrument monitorInstrument) {
			defer wg.Done()
			sem <- struct{}{}
			row, err := FreeMarketMonitorProvider{Client: client}.fetchYahooInstrument(ctx, instrument)
			<-sem
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				failures = append(failures, instrument.Symbol+": "+err.Error())
				return
			}
			rows[index] = row
			if row.CapturedAt.After(latest) {
				latest = row.CapturedAt
			}
		}(index, instrument)
	}
	wg.Wait()

	compact := rows[:0]
	for _, row := range rows {
		if row.Symbol != "" {
			compact = append(compact, row)
		}
	}
	return compact, latest, failures
}

type yahooChartResponse struct {
	Chart struct {
		Result []struct {
			Meta struct {
				Currency           string   `json:"currency"`
				Symbol             string   `json:"symbol"`
				ExchangeName       string   `json:"exchangeName"`
				RegularMarketPrice *float64 `json:"regularMarketPrice"`
				RegularMarketTime  int64    `json:"regularMarketTime"`
				ChartPreviousClose *float64 `json:"chartPreviousClose"`
			} `json:"meta"`
			Timestamp  []int64 `json:"timestamp"`
			Indicators struct {
				Quote []struct {
					Close  []*float64 `json:"close"`
					Volume []*float64 `json:"volume"`
				} `json:"quote"`
			} `json:"indicators"`
		} `json:"result"`
	} `json:"chart"`
}

func (p FreeMarketMonitorProvider) fetchYahooInstrument(ctx context.Context, instrument monitorInstrument) (MarketMonitorRow, error) {
	client := p.Client
	if client == nil {
		client = &http.Client{Timeout: 12 * time.Second}
	}
	var lastErr error
	for _, host := range []string{"query1.finance.yahoo.com", "query2.finance.yahoo.com"} {
		endpoint := "https://" + host + "/v8/finance/chart/" + url.PathEscape(instrument.Symbol) + "?range=3mo&interval=1d&includePrePost=false"
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
		if err != nil {
			lastErr = err
			continue
		}
		req.Header.Set("Accept", "application/json")
		req.Header.Set("User-Agent", "ApertureFinancialIntelligence/0.1")
		response, err := client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		if response.StatusCode < 200 || response.StatusCode >= 300 {
			response.Body.Close()
			lastErr = fmt.Errorf("public quote returned HTTP %d", response.StatusCode)
			continue
		}
		var payload yahooChartResponse
		err = json.NewDecoder(response.Body).Decode(&payload)
		response.Body.Close()
		if err != nil {
			lastErr = err
			continue
		}
		if len(payload.Chart.Result) == 0 {
			lastErr = errors.New("symbol was not returned by the public chart")
			continue
		}
		return normalizeYahooRow(instrument, payload.Chart.Result[0], endpoint)
	}
	if lastErr == nil {
		lastErr = errors.New("public quote unavailable")
	}
	return MarketMonitorRow{}, lastErr
}

func normalizeYahooRow(instrument monitorInstrument, result struct {
	Meta struct {
		Currency           string   `json:"currency"`
		Symbol             string   `json:"symbol"`
		ExchangeName       string   `json:"exchangeName"`
		RegularMarketPrice *float64 `json:"regularMarketPrice"`
		RegularMarketTime  int64    `json:"regularMarketTime"`
		ChartPreviousClose *float64 `json:"chartPreviousClose"`
	} `json:"meta"`
	Timestamp  []int64 `json:"timestamp"`
	Indicators struct {
		Quote []struct {
			Close  []*float64 `json:"close"`
			Volume []*float64 `json:"volume"`
		} `json:"quote"`
	} `json:"indicators"`
}, endpoint string) (MarketMonitorRow, error) {
	if len(result.Indicators.Quote) == 0 {
		return MarketMonitorRow{}, errors.New("public chart had no quote series")
	}
	quote := result.Indicators.Quote[0]
	points := make([]MonitorPoint, 0, len(result.Timestamp))
	volumes := make([]float64, 0, len(result.Timestamp))
	for index, timestamp := range result.Timestamp {
		if index >= len(quote.Close) || quote.Close[index] == nil || !isFinite(*quote.Close[index]) {
			continue
		}
		points = append(points, MonitorPoint{Timestamp: time.Unix(timestamp, 0).UTC(), Value: *quote.Close[index]})
		if index < len(quote.Volume) && quote.Volume[index] != nil && isFinite(*quote.Volume[index]) {
			volumes = append(volumes, *quote.Volume[index])
		}
	}
	if len(points) < 2 {
		return MarketMonitorRow{}, errors.New("public chart had fewer than two usable closes")
	}
	current := points[len(points)-1].Value
	previous := points[len(points)-2].Value
	if result.Meta.RegularMarketPrice != nil && isFinite(*result.Meta.RegularMarketPrice) && *result.Meta.RegularMarketPrice > 0 {
		current = *result.Meta.RegularMarketPrice
	}
	// Yahoo's chartPreviousClose is the close immediately before the requested
	// chart range, not necessarily the prior session. The final two usable chart
	// points are the reliable pair for a one-session movement calculation.
	first := points[0].Value
	capturedAt := points[len(points)-1].Timestamp
	if result.Meta.RegularMarketTime > 0 {
		capturedAt = time.Unix(result.Meta.RegularMarketTime, 0).UTC()
	}
	if len(points) > 32 {
		points = points[len(points)-32:]
	}
	var volume float64
	if len(volumes) > 0 {
		volume = volumes[len(volumes)-1]
	}
	currency := result.Meta.Currency
	if currency == "" {
		currency = instrument.Currency
	}
	symbol := result.Meta.Symbol
	if symbol == "" {
		symbol = instrument.Symbol
	}
	return MarketMonitorRow{
		Symbol:               symbol,
		Name:                 instrument.Name,
		Venue:                result.Meta.ExchangeName,
		Currency:             currency,
		Unit:                 instrument.Unit,
		Price:                current,
		DisplayValue:         formatMonitorValue(current, instrument.Format, currency, instrument.Unit),
		DailyChangePercent:   percentChange(current, previous),
		MonthlyChangePercent: percentChange(current, first),
		Volume:               volume,
		Sparkline:            points,
		Provider:             "free-yahoo",
		SourceURL:            "https://finance.yahoo.com/quote/" + url.PathEscape(symbol),
		CapturedAt:           capturedAt,
		IsProxy:              instrument.IsProxy,
		ProxyNote:            instrument.ProxyNote,
	}, nil
}

type frankfurterResponse struct {
	Base  string                        `json:"base"`
	Rates map[string]map[string]float64 `json:"rates"`
}

func (p FreeMarketMonitorProvider) loadFrankfurter(ctx context.Context, definition monitorDefinition) ([]MarketMonitorRow, time.Time, []string) {
	client := p.Client
	if client == nil {
		client = &http.Client{Timeout: 12 * time.Second}
	}
	quotes := make([]string, 0, len(definition.Instruments))
	for _, instrument := range definition.Instruments {
		parts := strings.Split(instrument.Symbol, "/")
		if len(parts) == 2 && parts[0] == "USD" {
			quotes = append(quotes, parts[1])
		}
	}
	if len(quotes) == 0 {
		return nil, time.Time{}, []string{"No supported currency pairs configured."}
	}
	endDate := time.Now().UTC()
	startDate := endDate.AddDate(0, 0, -7)
	values := url.Values{}
	values.Set("base", "USD")
	values.Set("symbols", strings.Join(quotes, ","))
	endpoint := "https://api.frankfurter.dev/v1/" + startDate.Format("2006-01-02") + ".." + endDate.Format("2006-01-02") + "?" + values.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, time.Time{}, []string{err.Error()}
	}
	req.Header.Set("Accept", "application/json")
	response, err := client.Do(req)
	if err != nil {
		return nil, time.Time{}, []string{"Frankfurter request failed."}
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, time.Time{}, []string{fmt.Sprintf("Frankfurter returned HTTP %d.", response.StatusCode)}
	}
	var payload frankfurterResponse
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return nil, time.Time{}, []string{"Frankfurter returned invalid JSON."}
	}
	dates := make([]string, 0, len(payload.Rates))
	for date := range payload.Rates {
		dates = append(dates, date)
	}
	sort.Strings(dates)
	if len(dates) == 0 {
		return nil, time.Time{}, []string{"Frankfurter returned no daily observations."}
	}
	latestDate := dates[len(dates)-1]
	previousDate := ""
	if len(dates) > 1 {
		previousDate = dates[len(dates)-2]
	}
	capturedAt, _ := time.ParseInLocation("2006-01-02", latestDate, time.UTC)
	capturedAt = capturedAt.Add(23*time.Hour + 59*time.Minute + 59*time.Second)

	rows := make([]MarketMonitorRow, 0, len(definition.Instruments))
	failures := make([]string, 0)
	for _, instrument := range definition.Instruments {
		parts := strings.Split(instrument.Symbol, "/")
		if len(parts) != 2 {
			continue
		}
		quote := parts[1]
		value, ok := payload.Rates[latestDate][quote]
		if !ok || !isFinite(value) || value <= 0 {
			failures = append(failures, instrument.Symbol+": reference rate unavailable")
			continue
		}
		previous := value
		if previousDate != "" {
			if candidate, exists := payload.Rates[previousDate][quote]; exists && isFinite(candidate) && candidate > 0 {
				previous = candidate
			}
		}
		sparkline := make([]MonitorPoint, 0, len(dates))
		for _, date := range dates {
			if rate, exists := payload.Rates[date][quote]; exists && isFinite(rate) {
				stamp, _ := time.ParseInLocation("2006-01-02", date, time.UTC)
				sparkline = append(sparkline, MonitorPoint{Timestamp: stamp, Value: rate})
			}
		}
		rows = append(rows, MarketMonitorRow{
			Symbol:               instrument.Symbol,
			Name:                 instrument.Name,
			Currency:             instrument.Currency,
			Unit:                 instrument.Unit,
			Price:                value,
			DisplayValue:         formatMonitorValue(value, instrument.Format, instrument.Currency, instrument.Unit),
			DailyChangePercent:   percentChange(value, previous),
			MonthlyChangePercent: percentChange(value, sparkline[0].Value),
			Sparkline:            sparkline,
			Provider:             "free-frankfurter",
			SourceURL:            "https://frankfurter.dev/",
			CapturedAt:           capturedAt,
		})
	}
	return rows, capturedAt, failures
}

func findMonitorDefinition(assetClass string) (monitorDefinition, bool) {
	assetClass = strings.ToLower(strings.TrimSpace(assetClass))
	for _, definition := range monitorDefinitions {
		if definition.ID == assetClass {
			return definition, true
		}
	}
	return monitorDefinition{}, false
}

func monitorClassSummaries() []MarketMonitorClassSummary {
	classes := make([]MarketMonitorClassSummary, 0, len(monitorDefinitions)+1)
	for _, definition := range monitorDefinitions {
		classes = append(classes, MarketMonitorClassSummary{ID: definition.ID, Label: definition.Label, Description: definition.Description, Coverage: definition.Coverage})
	}
	classes = append(classes, MarketMonitorClassSummary{
		ID:          "crypto",
		Label:       "Digital assets",
		Description: "Dedicated public crypto monitor with exchange scope and VargaTrend history.",
		Coverage:    "OKX and supported public exchange spot markets",
	})
	return classes
}

func assetProfileFromMonitorRow(row MarketMonitorRow, monitorClass string) AssetProfile {
	assetClass := map[string]string{
		"equities":        "equity",
		"funds":           "etf",
		"fixed-income":    "bond",
		"currencies":      "forex",
		"commodities":     "commodity",
		"real-estate":     "reit",
		"derivatives":     "future",
		"private-markets": "private_equity",
		"cash-rates":      "cash",
		"protection":      "insurance",
	}[monitorClass]
	if assetClass == "" {
		assetClass = "other"
	}
	return AssetProfile{
		Ticker:         row.Symbol,
		ProviderSymbol: row.Symbol,
		Name:           row.Name,
		Exchange:       row.Venue,
		Type:           assetClass,
		AssetClass:     assetClass,
		Currency:       row.Currency,
		PriceCents:     int64(math.Round(row.Price * 100)),
		DisplayPrice:   row.DisplayValue,
		DailyChangeBp:  int(math.Round(row.DailyChangePercent * 100)),
		FreshAt:        row.CapturedAt,
		Provider:       row.Provider,
	}
}

func isFinite(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}

func percentChange(current, previous float64) float64 {
	if !isFinite(current) || !isFinite(previous) || previous == 0 {
		return 0
	}
	return (current/previous - 1) * 100
}

func formatMonitorValue(value float64, format, currency, unit string) string {
	if format == "percent" {
		return fmt.Sprintf("%.2f%%", value)
	}
	if format == "rate" {
		return fmt.Sprintf("%.5f %s", value, unit)
	}
	prefix := map[string]string{"USD": "$", "EUR": "€", "GBP": "£", "JPY": "¥", "CNY": "¥", "INR": "₹"}[currency]
	if prefix == "" {
		prefix = currency + " "
	}
	if unit != "" {
		return fmt.Sprintf("%s%.4f %s", prefix, value, unit)
	}
	return fmt.Sprintf("%s%.2f", prefix, value)
}
