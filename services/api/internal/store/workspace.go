package store

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sort"
	"strings"
	"sync"
)

var (
	ErrNotFound  = errors.New("not found")
	ErrConflict  = errors.New("conflict")
	ErrBadTicker = errors.New("bad ticker")
)

type WorkspaceStore struct {
	mu         sync.Mutex
	assets     *SeedAssetStore
	portfolios map[string]*Portfolio
	watchlists map[string]*Watchlist
}

type Portfolio struct {
	ID            string           `json:"id"`
	UserID        string           `json:"-"`
	Name          string           `json:"name"`
	BaseCurrency  string           `json:"baseCurrency"`
	Visibility    string           `json:"visibility"`
	Holdings      []Holding        `json:"holdings"`
	Transactions  []Transaction    `json:"transactions"`
	Summary       PortfolioSummary `json:"summary"`
	Allocation    []Allocation     `json:"allocation"`
	DataFreshness DataFreshness    `json:"dataFreshness"`
}

type Holding struct {
	ID               string `json:"id"`
	Asset            Asset  `json:"asset"`
	Quantity         int64  `json:"quantity"`
	DisplayQuantity  string `json:"displayQuantity"`
	AverageCostCents int64  `json:"-"`
	DisplayAvgCost   string `json:"displayAvgCost"`
	MarketValueCents int64  `json:"-"`
	DisplayValue     string `json:"displayValue"`
	WeightBps        int    `json:"weightBps"`
	Notes            string `json:"notes,omitempty"`
}

type PortfolioSummary struct {
	TotalValueCents        int64  `json:"-"`
	DisplayTotalValue      string `json:"displayTotalValue"`
	TopConcentrationTicker string `json:"topConcentrationTicker"`
	TopConcentrationBps    int    `json:"topConcentrationBps"`
	HoldingCount           int    `json:"holdingCount"`
	ReviewFlags            int    `json:"reviewFlags"`
}

type Transaction struct {
	ID              string `json:"id"`
	AssetTicker     string `json:"assetTicker,omitempty"`
	Type            string `json:"type"`
	TransactionDate string `json:"transactionDate"`
	Quantity        int64  `json:"quantity,omitempty"`
	DisplayQuantity string `json:"displayQuantity,omitempty"`
	AmountCents     int64  `json:"-"`
	DisplayAmount   string `json:"displayAmount"`
	Notes           string `json:"notes,omitempty"`
}

type Allocation struct {
	Label     string `json:"label"`
	WeightBps int    `json:"weightBps"`
	Status    string `json:"status"`
}

type DataFreshness struct {
	Provider   string `json:"provider"`
	CapturedAt string `json:"capturedAt"`
	Freshness  string `json:"freshness"`
}

type Watchlist struct {
	ID            string          `json:"id"`
	UserID        string          `json:"-"`
	Name          string          `json:"name"`
	Items         []WatchlistItem `json:"items"`
	DataFreshness DataFreshness   `json:"dataFreshness"`
}

type WatchlistItem struct {
	ID    string `json:"id"`
	Asset Asset  `json:"asset"`
	Notes string `json:"notes,omitempty"`
}

func NewWorkspaceStore(assets *SeedAssetStore) *WorkspaceStore {
	if assets == nil {
		assets = NewSeedAssetStore()
	}
	return &WorkspaceStore{
		assets:     assets,
		portfolios: map[string]*Portfolio{},
		watchlists: map[string]*Watchlist{},
	}
}

func (s *WorkspaceStore) ListPortfolios(userID string) []Portfolio {
	s.mu.Lock()
	defer s.mu.Unlock()

	var portfolios []Portfolio
	for _, portfolio := range s.portfolios {
		if portfolio.UserID == userID {
			portfolios = append(portfolios, clonePortfolio(portfolio))
		}
	}
	sort.Slice(portfolios, func(i, j int) bool { return portfolios[i].Name < portfolios[j].Name })
	return portfolios
}

func (s *WorkspaceStore) CreatePortfolio(userID, name, baseCurrency string, seedDemo bool) (Portfolio, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	name = cleanName(name, "Core research portfolio")
	baseCurrency = strings.ToUpper(strings.TrimSpace(baseCurrency))
	if baseCurrency == "" {
		baseCurrency = "USD"
	}

	portfolio := &Portfolio{
		ID:           newID("pf"),
		UserID:       userID,
		Name:         name,
		BaseCurrency: baseCurrency,
		Visibility:   "private",
		DataFreshness: DataFreshness{
			Provider:   "demo-seed",
			CapturedAt: "2026-05-22T21:00:00Z",
			Freshness:  "deterministic-demo-data",
		},
	}
	if seedDemo {
		for _, seed := range []struct {
			ticker           string
			quantity         int64
			averageCostCents int64
			notes            string
		}{
			{"NVDA", 420, 11820, "AI infrastructure exposure for concentration review."},
			{"MSFT", 120, 40510, "Large-cap software and cloud allocation."},
			{"VTI", 185, 28142, "Broad market ballast for comparison."},
			{"JPM", 90, 23884, "Financials exposure in seeded demo account."},
			{"BND", 320, 7310, "Fixed-income sleeve for allocation review."},
		} {
			asset, ok := s.assets.ByTicker(seed.ticker)
			if !ok {
				return Portfolio{}, ErrBadTicker
			}
			portfolio.Holdings = append(portfolio.Holdings, Holding{
				ID:               newID("hld"),
				Asset:            asset,
				Quantity:         seed.quantity,
				DisplayQuantity:  formatShares(seed.quantity),
				AverageCostCents: seed.averageCostCents,
				DisplayAvgCost:   formatMoney(seed.averageCostCents),
				Notes:            seed.notes,
			})
			portfolio.Transactions = append(portfolio.Transactions, Transaction{
				ID:              newID("txn"),
				AssetTicker:     seed.ticker,
				Type:            "buy",
				TransactionDate: "2026-05-01",
				Quantity:        seed.quantity,
				DisplayQuantity: formatShares(seed.quantity),
				AmountCents:     seed.quantity * seed.averageCostCents,
				DisplayAmount:   formatMoney(seed.quantity * seed.averageCostCents),
				Notes:           "Seeded demo transaction for portfolio review.",
			})
		}
	}
	s.recalculatePortfolio(portfolio)
	s.portfolios[portfolio.ID] = portfolio

	return clonePortfolio(portfolio), nil
}

func (s *WorkspaceStore) GetPortfolio(userID, id string) (Portfolio, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	portfolio, ok := s.portfolios[id]
	if !ok || portfolio.UserID != userID {
		return Portfolio{}, ErrNotFound
	}
	return clonePortfolio(portfolio), nil
}

func (s *WorkspaceStore) UpdatePortfolio(userID, id, name, baseCurrency string) (Portfolio, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	portfolio, ok := s.portfolios[id]
	if !ok || portfolio.UserID != userID {
		return Portfolio{}, ErrNotFound
	}
	if strings.TrimSpace(name) != "" {
		portfolio.Name = cleanName(name, portfolio.Name)
	}
	if strings.TrimSpace(baseCurrency) != "" {
		portfolio.BaseCurrency = strings.ToUpper(strings.TrimSpace(baseCurrency))
	}
	return clonePortfolio(portfolio), nil
}

func (s *WorkspaceStore) DeletePortfolio(userID, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	portfolio, ok := s.portfolios[id]
	if !ok || portfolio.UserID != userID {
		return ErrNotFound
	}
	delete(s.portfolios, id)
	return nil
}

func (s *WorkspaceStore) AddHolding(userID, portfolioID, ticker string, quantity int64, averageCostCents int64, notes string) (Portfolio, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	portfolio, ok := s.portfolios[portfolioID]
	if !ok || portfolio.UserID != userID {
		return Portfolio{}, ErrNotFound
	}
	asset, ok := s.assets.ByTicker(ticker)
	if !ok {
		return Portfolio{}, ErrBadTicker
	}
	if quantity <= 0 {
		quantity = 1
	}

	for i := range portfolio.Holdings {
		if portfolio.Holdings[i].Asset.Ticker == asset.Ticker {
			portfolio.Holdings[i].Quantity += quantity
			portfolio.Holdings[i].DisplayQuantity = formatShares(portfolio.Holdings[i].Quantity)
			if averageCostCents > 0 {
				portfolio.Holdings[i].AverageCostCents = averageCostCents
				portfolio.Holdings[i].DisplayAvgCost = formatMoney(averageCostCents)
			}
			if strings.TrimSpace(notes) != "" {
				portfolio.Holdings[i].Notes = strings.TrimSpace(notes)
			}
			portfolio.Transactions = append(portfolio.Transactions, transactionForHolding(asset.Ticker, quantity, averageCostCents, notes))
			s.recalculatePortfolio(portfolio)
			return clonePortfolio(portfolio), nil
		}
	}

	portfolio.Holdings = append(portfolio.Holdings, Holding{
		ID:               newID("hld"),
		Asset:            asset,
		Quantity:         quantity,
		DisplayQuantity:  formatShares(quantity),
		AverageCostCents: averageCostCents,
		DisplayAvgCost:   formatMoney(averageCostCents),
		Notes:            strings.TrimSpace(notes),
	})
	portfolio.Transactions = append(portfolio.Transactions, transactionForHolding(asset.Ticker, quantity, averageCostCents, notes))
	s.recalculatePortfolio(portfolio)
	return clonePortfolio(portfolio), nil
}

func (s *WorkspaceStore) ListWatchlists(userID string) []Watchlist {
	s.mu.Lock()
	defer s.mu.Unlock()

	var watchlists []Watchlist
	for _, watchlist := range s.watchlists {
		if watchlist.UserID == userID {
			watchlists = append(watchlists, cloneWatchlist(watchlist))
		}
	}
	sort.Slice(watchlists, func(i, j int) bool { return watchlists[i].Name < watchlists[j].Name })
	return watchlists
}

func (s *WorkspaceStore) CreateWatchlist(userID, name string, seedDemo bool) (Watchlist, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	watchlist := &Watchlist{
		ID:     newID("wl"),
		UserID: userID,
		Name:   cleanName(name, "Research watchlist"),
		DataFreshness: DataFreshness{
			Provider:   "demo-seed",
			CapturedAt: "2026-05-22T21:00:00Z",
			Freshness:  "deterministic-demo-data",
		},
	}
	if seedDemo {
		for _, ticker := range []string{"AAPL", "NVDA", "MSFT", "VTI"} {
			asset, ok := s.assets.ByTicker(ticker)
			if !ok {
				return Watchlist{}, ErrBadTicker
			}
			watchlist.Items = append(watchlist.Items, WatchlistItem{ID: newID("wli"), Asset: asset})
		}
	}
	s.watchlists[watchlist.ID] = watchlist
	return cloneWatchlist(watchlist), nil
}

func (s *WorkspaceStore) AddWatchlistItem(userID, watchlistID, ticker, notes string) (Watchlist, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	watchlist, ok := s.watchlists[watchlistID]
	if !ok || watchlist.UserID != userID {
		return Watchlist{}, ErrNotFound
	}
	asset, ok := s.assets.ByTicker(ticker)
	if !ok {
		return Watchlist{}, ErrBadTicker
	}
	for _, item := range watchlist.Items {
		if item.Asset.Ticker == asset.Ticker {
			return Watchlist{}, ErrConflict
		}
	}
	watchlist.Items = append(watchlist.Items, WatchlistItem{
		ID:    newID("wli"),
		Asset: asset,
		Notes: strings.TrimSpace(notes),
	})
	return cloneWatchlist(watchlist), nil
}

func (s *WorkspaceStore) recalculatePortfolio(portfolio *Portfolio) {
	total := int64(0)
	sectorTotals := map[string]int64{}
	for i := range portfolio.Holdings {
		holding := &portfolio.Holdings[i]
		holding.MarketValueCents = holding.Quantity * holding.Asset.PriceCents
		holding.DisplayValue = formatMoney(holding.MarketValueCents)
		total += holding.MarketValueCents
		sector := holding.Asset.Sector
		if sector == "" {
			sector = "Other"
		}
		sectorTotals[sector] += holding.MarketValueCents
	}

	topTicker := ""
	topWeight := 0
	for i := range portfolio.Holdings {
		weight := 0
		if total > 0 {
			weight = int((portfolio.Holdings[i].MarketValueCents * 10000) / total)
		}
		portfolio.Holdings[i].WeightBps = weight
		if weight > topWeight {
			topWeight = weight
			topTicker = portfolio.Holdings[i].Asset.Ticker
		}
	}

	portfolio.Allocation = portfolio.Allocation[:0]
	for sector, value := range sectorTotals {
		weight := 0
		if total > 0 {
			weight = int((value * 10000) / total)
		}
		status := "ok"
		if weight >= 3500 {
			status = "review"
		}
		portfolio.Allocation = append(portfolio.Allocation, Allocation{Label: sector, WeightBps: weight, Status: status})
	}
	sort.Slice(portfolio.Allocation, func(i, j int) bool {
		return portfolio.Allocation[i].WeightBps > portfolio.Allocation[j].WeightBps
	})

	reviewFlags := 0
	if topWeight >= 3000 {
		reviewFlags++
	}
	for _, allocation := range portfolio.Allocation {
		if allocation.Status == "review" {
			reviewFlags++
		}
	}
	portfolio.Summary = PortfolioSummary{
		TotalValueCents:        total,
		DisplayTotalValue:      formatMoney(total),
		TopConcentrationTicker: topTicker,
		TopConcentrationBps:    topWeight,
		HoldingCount:           len(portfolio.Holdings),
		ReviewFlags:            reviewFlags,
	}
}

func clonePortfolio(portfolio *Portfolio) Portfolio {
	copyPortfolio := *portfolio
	copyPortfolio.Holdings = append([]Holding(nil), portfolio.Holdings...)
	copyPortfolio.Transactions = append([]Transaction(nil), portfolio.Transactions...)
	copyPortfolio.Allocation = append([]Allocation(nil), portfolio.Allocation...)
	return copyPortfolio
}

func cloneWatchlist(watchlist *Watchlist) Watchlist {
	copyWatchlist := *watchlist
	copyWatchlist.Items = append([]WatchlistItem(nil), watchlist.Items...)
	return copyWatchlist
}

func cleanName(value string, fallback string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}
	if len(value) > 80 {
		return value[:80]
	}
	return value
}

func newID(prefix string) string {
	var bytes [8]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return prefix + "_deterministic"
	}
	return prefix + "_" + hex.EncodeToString(bytes[:])
}

func transactionForHolding(ticker string, quantity int64, averageCostCents int64, notes string) Transaction {
	if averageCostCents < 0 {
		averageCostCents = 0
	}
	return Transaction{
		ID:              newID("txn"),
		AssetTicker:     ticker,
		Type:            "buy",
		TransactionDate: "2026-05-23",
		Quantity:        quantity,
		DisplayQuantity: formatShares(quantity),
		AmountCents:     quantity * averageCostCents,
		DisplayAmount:   formatMoney(quantity * averageCostCents),
		Notes:           strings.TrimSpace(notes),
	}
}

func formatShares(quantity int64) string {
	return formatThousands(quantity)
}

func formatMoney(cents int64) string {
	sign := ""
	if cents < 0 {
		sign = "-"
		cents = -cents
	}
	dollars := cents / 100
	remainder := cents % 100
	return sign + "$" + formatThousands(dollars) + "." + twoDigits(remainder)
}

func formatThousands(value int64) string {
	if value == 0 {
		return "0"
	}
	var parts []byte
	digits := []byte{}
	for value > 0 {
		digits = append(digits, byte('0'+value%10))
		value /= 10
	}
	for i := len(digits) - 1; i >= 0; i-- {
		parts = append(parts, digits[i])
		if i > 0 && i%3 == 0 {
			parts = append(parts, ',')
		}
	}
	return string(parts)
}

func twoDigits(value int64) string {
	if value < 10 {
		return "0" + string(byte('0'+value))
	}
	return string([]byte{byte('0' + value/10), byte('0' + value%10)})
}
