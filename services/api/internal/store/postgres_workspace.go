package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresWorkspaceStore struct {
	pool *pgxpool.Pool
}

type workspaceDB interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

func NewPostgresWorkspaceStore(pool *pgxpool.Pool) *PostgresWorkspaceStore {
	return &PostgresWorkspaceStore{pool: pool}
}

func (s *PostgresWorkspaceStore) ListPortfolios(ctx context.Context, clerkUserID string) ([]Portfolio, error) {
	rows, err := s.pool.Query(ctx, `
		select portfolio.id::text
		from public.portfolios portfolio
		join public.profiles profile on profile.id = portfolio.user_id
		where profile.clerk_user_id = $1
		order by portfolio.name, portfolio.id`, clerkUserID)
	if err != nil {
		return nil, fmt.Errorf("list portfolios: %w", err)
	}
	defer rows.Close()
	ids := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan portfolio id: %w", err)
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate portfolios: %w", err)
	}
	portfolios := make([]Portfolio, 0, len(ids))
	for _, id := range ids {
		portfolio, err := s.GetPortfolio(ctx, clerkUserID, id)
		if err != nil {
			return nil, err
		}
		portfolios = append(portfolios, portfolio)
	}
	return portfolios, nil
}

func (s *PostgresWorkspaceStore) CountPortfolios(ctx context.Context, clerkUserID string) (int, error) {
	return countOwned(ctx, s.pool, clerkUserID, "portfolios")
}

func (s *PostgresWorkspaceStore) CreatePortfolio(ctx context.Context, clerkUserID, name, baseCurrency string, initialHoldings []Holding) (Portfolio, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Portfolio{}, fmt.Errorf("begin create portfolio: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	profileID, err := ensureProfile(ctx, tx, clerkUserID)
	if err != nil {
		return Portfolio{}, err
	}
	name = cleanName(name, "Core research portfolio")
	baseCurrency = normalizeCurrency(baseCurrency)
	var portfolioID string
	if err := tx.QueryRow(ctx, `
		insert into public.portfolios (user_id, name, base_currency, visibility)
		values ($1::uuid, $2, $3, 'private')
		returning id::text`, profileID, name, baseCurrency).Scan(&portfolioID); err != nil {
		return Portfolio{}, fmt.Errorf("insert portfolio: %w", err)
	}
	for _, holding := range initialHoldings {
		if holding.Quantity <= 0 || strings.TrimSpace(holding.Asset.Ticker) == "" {
			continue
		}
		if err := insertHolding(ctx, tx, portfolioID, holding.Asset, holding.Quantity, holding.AverageCostCents, holding.Notes); err != nil {
			return Portfolio{}, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return Portfolio{}, fmt.Errorf("commit create portfolio: %w", err)
	}
	return s.GetPortfolio(ctx, clerkUserID, portfolioID)
}

func (s *PostgresWorkspaceStore) GetPortfolio(ctx context.Context, clerkUserID, id string) (Portfolio, error) {
	var portfolio Portfolio
	err := s.pool.QueryRow(ctx, `
		select portfolio.id::text, profile.clerk_user_id, portfolio.name, portfolio.base_currency, portfolio.visibility
		from public.portfolios portfolio
		join public.profiles profile on profile.id = portfolio.user_id
		where portfolio.id = $1::uuid and profile.clerk_user_id = $2`, id, clerkUserID).
		Scan(&portfolio.ID, &portfolio.UserID, &portfolio.Name, &portfolio.BaseCurrency, &portfolio.Visibility)
	if errors.Is(err, pgx.ErrNoRows) {
		return Portfolio{}, ErrNotFound
	}
	if err != nil {
		return Portfolio{}, fmt.Errorf("get portfolio: %w", err)
	}
	if err := loadPortfolioHoldings(ctx, s.pool, &portfolio); err != nil {
		return Portfolio{}, err
	}
	if err := loadPortfolioTransactions(ctx, s.pool, &portfolio); err != nil {
		return Portfolio{}, err
	}
	portfolio.DataFreshness = dataFreshnessFromAssets(portfolio.Holdings)
	recalculatePortfolio(&portfolio)
	return portfolio, nil
}

func (s *PostgresWorkspaceStore) UpdatePortfolio(ctx context.Context, clerkUserID, id, name, baseCurrency string) (Portfolio, error) {
	tag, err := s.pool.Exec(ctx, `
		update public.portfolios portfolio
		set name = case when btrim($3) = '' then portfolio.name else left(btrim($3), 80) end,
			base_currency = case when btrim($4) = '' then portfolio.base_currency else upper(btrim($4)) end
		from public.profiles profile
		where portfolio.id = $1::uuid and portfolio.user_id = profile.id and profile.clerk_user_id = $2`, id, clerkUserID, name, baseCurrency)
	if err != nil {
		return Portfolio{}, fmt.Errorf("update portfolio: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return Portfolio{}, ErrNotFound
	}
	return s.GetPortfolio(ctx, clerkUserID, id)
}

func (s *PostgresWorkspaceStore) DeletePortfolio(ctx context.Context, clerkUserID, id string) error {
	tag, err := s.pool.Exec(ctx, `
		delete from public.portfolios portfolio
		using public.profiles profile
		where portfolio.id = $1::uuid and portfolio.user_id = profile.id and profile.clerk_user_id = $2`, id, clerkUserID)
	if err != nil {
		return fmt.Errorf("delete portfolio: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresWorkspaceStore) AddHolding(ctx context.Context, clerkUserID, portfolioID string, asset Asset, quantity, averageCostCents int64, notes string) (Portfolio, error) {
	if strings.TrimSpace(asset.Ticker) == "" || asset.PriceCents <= 0 {
		return Portfolio{}, ErrBadTicker
	}
	if quantity <= 0 {
		quantity = 1
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Portfolio{}, fmt.Errorf("begin add holding: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	owned, err := ownsPortfolio(ctx, tx, clerkUserID, portfolioID)
	if err != nil {
		return Portfolio{}, err
	}
	if !owned {
		return Portfolio{}, ErrNotFound
	}
	if err := insertHolding(ctx, tx, portfolioID, asset, quantity, averageCostCents, notes); err != nil {
		return Portfolio{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Portfolio{}, fmt.Errorf("commit add holding: %w", err)
	}
	return s.GetPortfolio(ctx, clerkUserID, portfolioID)
}

func (s *PostgresWorkspaceStore) CountHoldings(ctx context.Context, clerkUserID string) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx, `
		select count(*)::int
		from public.holdings holding
		join public.portfolios portfolio on portfolio.id = holding.portfolio_id
		join public.profiles profile on profile.id = portfolio.user_id
		where profile.clerk_user_id = $1`, clerkUserID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count holdings: %w", err)
	}
	return count, nil
}

func (s *PostgresWorkspaceStore) HasHolding(ctx context.Context, clerkUserID, portfolioID, ticker string) (bool, error) {
	var exists bool
	err := s.pool.QueryRow(ctx, `
		select exists (
			select 1 from public.holdings holding
			join public.portfolios portfolio on portfolio.id = holding.portfolio_id
			join public.profiles profile on profile.id = portfolio.user_id
			join public.assets asset on asset.id = holding.asset_id
			where portfolio.id = $1::uuid and profile.clerk_user_id = $2 and asset.ticker = upper(btrim($3))
		)`, portfolioID, clerkUserID, ticker).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check holding: %w", err)
	}
	return exists, nil
}

func (s *PostgresWorkspaceStore) ListWatchlists(ctx context.Context, clerkUserID string) ([]Watchlist, error) {
	rows, err := s.pool.Query(ctx, `
		select watchlist.id::text, profile.clerk_user_id, watchlist.name
		from public.watchlists watchlist
		join public.profiles profile on profile.id = watchlist.user_id
		where profile.clerk_user_id = $1
		order by watchlist.name, watchlist.id`, clerkUserID)
	if err != nil {
		return nil, fmt.Errorf("list watchlists: %w", err)
	}
	defer rows.Close()
	watchlists := []Watchlist{}
	for rows.Next() {
		var watchlist Watchlist
		if err := rows.Scan(&watchlist.ID, &watchlist.UserID, &watchlist.Name); err != nil {
			return nil, fmt.Errorf("scan watchlist: %w", err)
		}
		watchlists = append(watchlists, watchlist)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate watchlists: %w", err)
	}
	for index := range watchlists {
		if err := loadWatchlistItems(ctx, s.pool, &watchlists[index]); err != nil {
			return nil, err
		}
		watchlists[index].DataFreshness = watchlistFreshness(watchlists[index].Items)
	}
	return watchlists, nil
}

func (s *PostgresWorkspaceStore) CountWatchlists(ctx context.Context, clerkUserID string) (int, error) {
	return countOwned(ctx, s.pool, clerkUserID, "watchlists")
}

func (s *PostgresWorkspaceStore) CreateWatchlist(ctx context.Context, clerkUserID, name string, initialAssets []Asset) (Watchlist, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Watchlist{}, fmt.Errorf("begin create watchlist: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	profileID, err := ensureProfile(ctx, tx, clerkUserID)
	if err != nil {
		return Watchlist{}, err
	}
	var watchlistID string
	if err := tx.QueryRow(ctx, `
		insert into public.watchlists (user_id, name)
		values ($1::uuid, $2)
		returning id::text`, profileID, cleanName(name, "Research watchlist")).Scan(&watchlistID); err != nil {
		return Watchlist{}, fmt.Errorf("insert watchlist: %w", err)
	}
	for _, asset := range initialAssets {
		if strings.TrimSpace(asset.Ticker) == "" {
			continue
		}
		assetID, err := upsertAsset(ctx, tx, asset)
		if err != nil {
			return Watchlist{}, err
		}
		if err := persistPriceSnapshot(ctx, tx, assetID, asset); err != nil {
			return Watchlist{}, err
		}
		if _, err := tx.Exec(ctx, `insert into public.watchlist_items (watchlist_id, asset_id) values ($1::uuid, $2::uuid) on conflict (watchlist_id, asset_id) do nothing`, watchlistID, assetID); err != nil {
			return Watchlist{}, fmt.Errorf("insert watchlist item: %w", err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return Watchlist{}, fmt.Errorf("commit create watchlist: %w", err)
	}
	return s.getWatchlist(ctx, clerkUserID, watchlistID)
}

func (s *PostgresWorkspaceStore) AddWatchlistItem(ctx context.Context, clerkUserID, watchlistID string, asset Asset, notes string) (Watchlist, error) {
	if strings.TrimSpace(asset.Ticker) == "" {
		return Watchlist{}, ErrBadTicker
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Watchlist{}, fmt.Errorf("begin add watchlist item: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	owned, err := ownsWatchlist(ctx, tx, clerkUserID, watchlistID)
	if err != nil {
		return Watchlist{}, err
	}
	if !owned {
		return Watchlist{}, ErrNotFound
	}
	assetID, err := upsertAsset(ctx, tx, asset)
	if err != nil {
		return Watchlist{}, err
	}
	if err := persistPriceSnapshot(ctx, tx, assetID, asset); err != nil {
		return Watchlist{}, err
	}
	tag, err := tx.Exec(ctx, `insert into public.watchlist_items (watchlist_id, asset_id, notes) values ($1::uuid, $2::uuid, nullif(btrim($3), '')) on conflict (watchlist_id, asset_id) do nothing`, watchlistID, assetID, notes)
	if err != nil {
		return Watchlist{}, fmt.Errorf("insert watchlist item: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return Watchlist{}, ErrConflict
	}
	if err := tx.Commit(ctx); err != nil {
		return Watchlist{}, fmt.Errorf("commit add watchlist item: %w", err)
	}
	return s.getWatchlist(ctx, clerkUserID, watchlistID)
}

func (s *PostgresWorkspaceStore) getWatchlist(ctx context.Context, clerkUserID, id string) (Watchlist, error) {
	var watchlist Watchlist
	err := s.pool.QueryRow(ctx, `
		select watchlist.id::text, profile.clerk_user_id, watchlist.name
		from public.watchlists watchlist
		join public.profiles profile on profile.id = watchlist.user_id
		where watchlist.id = $1::uuid and profile.clerk_user_id = $2`, id, clerkUserID).
		Scan(&watchlist.ID, &watchlist.UserID, &watchlist.Name)
	if errors.Is(err, pgx.ErrNoRows) {
		return Watchlist{}, ErrNotFound
	}
	if err != nil {
		return Watchlist{}, fmt.Errorf("get watchlist: %w", err)
	}
	if err := loadWatchlistItems(ctx, s.pool, &watchlist); err != nil {
		return Watchlist{}, err
	}
	watchlist.DataFreshness = watchlistFreshness(watchlist.Items)
	return watchlist, nil
}

func ensureProfile(ctx context.Context, db workspaceDB, clerkUserID string) (string, error) {
	var id string
	err := db.QueryRow(ctx, `
		insert into public.profiles (clerk_user_id)
		values ($1)
		on conflict (clerk_user_id) do update set clerk_user_id = excluded.clerk_user_id
		returning id::text`, clerkUserID).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("ensure profile: %w", err)
	}
	return id, nil
}

func countOwned(ctx context.Context, db workspaceDB, clerkUserID, table string) (int, error) {
	if table != "portfolios" && table != "watchlists" {
		return 0, errors.New("unsupported owned table")
	}
	var count int
	query := fmt.Sprintf(`select count(*)::int from public.%s item join public.profiles profile on profile.id = item.user_id where profile.clerk_user_id = $1`, table)
	if err := db.QueryRow(ctx, query, clerkUserID).Scan(&count); err != nil {
		return 0, fmt.Errorf("count %s: %w", table, err)
	}
	return count, nil
}

func ownsPortfolio(ctx context.Context, db workspaceDB, clerkUserID, portfolioID string) (bool, error) {
	var owned bool
	err := db.QueryRow(ctx, `select exists (select 1 from public.portfolios portfolio join public.profiles profile on profile.id = portfolio.user_id where portfolio.id = $1::uuid and profile.clerk_user_id = $2)`, portfolioID, clerkUserID).Scan(&owned)
	return owned, err
}

func ownsWatchlist(ctx context.Context, db workspaceDB, clerkUserID, watchlistID string) (bool, error) {
	var owned bool
	err := db.QueryRow(ctx, `select exists (select 1 from public.watchlists watchlist join public.profiles profile on profile.id = watchlist.user_id where watchlist.id = $1::uuid and profile.clerk_user_id = $2)`, watchlistID, clerkUserID).Scan(&owned)
	return owned, err
}

func insertHolding(ctx context.Context, db workspaceDB, portfolioID string, asset Asset, quantity, averageCostCents int64, notes string) error {
	assetID, err := upsertAsset(ctx, db, asset)
	if err != nil {
		return err
	}
	if err := persistPriceSnapshot(ctx, db, assetID, asset); err != nil {
		return err
	}
	var holdingID string
	err = db.QueryRow(ctx, `
		insert into public.holdings (portfolio_id, asset_id, quantity, average_cost, notes)
		values ($1::uuid, $2::uuid, $3, $4::numeric / 100.0, nullif(btrim($5), ''))
		on conflict (portfolio_id, asset_id) do update
		set quantity = public.holdings.quantity + excluded.quantity,
			average_cost = case when excluded.average_cost > 0 then excluded.average_cost else public.holdings.average_cost end,
			notes = coalesce(excluded.notes, public.holdings.notes)
		returning id::text`, portfolioID, assetID, quantity, averageCostCents, notes).Scan(&holdingID)
	if err != nil {
		return fmt.Errorf("upsert holding: %w", err)
	}
	_, err = db.Exec(ctx, `
		insert into public.transactions (portfolio_id, holding_id, asset_id, transaction_type, transaction_date, quantity, amount, currency, notes)
		values ($1::uuid, $2::uuid, $3::uuid, 'buy', current_date, $4, ($4::numeric * $5::numeric) / 100.0, $6, nullif(btrim($7), ''))`,
		portfolioID, holdingID, assetID, quantity, maxInt64(averageCostCents, 0), normalizeCurrency(asset.Currency), notes)
	if err != nil {
		return fmt.Errorf("insert transaction: %w", err)
	}
	return nil
}

func upsertAsset(ctx context.Context, db workspaceDB, asset Asset) (string, error) {
	assetClass := normalizeAssetClass(asset.AssetClass)
	if assetClass == "other" {
		assetClass = normalizeAssetClass(asset.Type)
	}
	metadata, _ := json.Marshal(map[string]any{"dailyChangeBps": asset.DailyChangeBp})
	var id string
	err := db.QueryRow(ctx, `
		insert into public.assets (
			ticker, name, exchange, asset_type, asset_class, sector, cik, metadata,
			country_code, country_name, region, currency, mic, isin, cusip, figi, provider_symbol
		) values (
			upper(btrim($1)), $2, $3, $4, $4, nullif(btrim($5), ''), nullif(btrim($6), ''), $7::jsonb,
			nullif(btrim($8), ''), nullif(btrim($9), ''), nullif(btrim($10), ''), nullif(btrim($11), ''),
			nullif(btrim($12), ''), nullif(btrim($13), ''), nullif(btrim($14), ''), nullif(btrim($15), ''), nullif(btrim($16), '')
		)
		on conflict (ticker) do update set
			name = excluded.name, exchange = excluded.exchange, asset_type = excluded.asset_type,
			asset_class = excluded.asset_class, sector = excluded.sector, cik = excluded.cik,
			metadata = public.assets.metadata || excluded.metadata, country_code = excluded.country_code,
			country_name = excluded.country_name, region = excluded.region, currency = excluded.currency,
			mic = excluded.mic, isin = excluded.isin, cusip = excluded.cusip, figi = excluded.figi,
			provider_symbol = excluded.provider_symbol
		returning id::text`,
		asset.Ticker, fallback(asset.Name, asset.Ticker), fallback(asset.Exchange, "UNKNOWN"), assetClass,
		asset.Sector, asset.CIK, string(metadata), asset.CountryCode, asset.Country, asset.Region, asset.Currency,
		asset.MIC, asset.ISIN, asset.CUSIP, asset.FIGI, fallback(asset.ProviderSymbol, asset.Ticker)).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("upsert asset: %w", err)
	}
	return id, nil
}

func persistPriceSnapshot(ctx context.Context, db workspaceDB, assetID string, asset Asset) error {
	if asset.PriceCents <= 0 {
		return nil
	}
	capturedAt := time.Now().UTC()
	if parsed, err := time.Parse(time.RFC3339, asset.CapturedAt); err == nil {
		capturedAt = parsed
	}
	_, err := db.Exec(ctx, `
		insert into public.price_snapshots (asset_id, captured_at, close_price, provider, freshness)
		values ($1::uuid, $2, $3::numeric / 100.0, $4, $5)
		on conflict (asset_id, captured_at, provider) do update
		set close_price = excluded.close_price, freshness = excluded.freshness`,
		assetID, capturedAt, asset.PriceCents, fallback(asset.Provider, "real-provider"), fallback(asset.Freshness, "provider-reported"))
	if err != nil {
		return fmt.Errorf("persist price snapshot: %w", err)
	}
	return nil
}

func loadPortfolioHoldings(ctx context.Context, db workspaceDB, portfolio *Portfolio) error {
	rows, err := db.Query(ctx, assetSelect(`
		select holding.id::text, round(holding.quantity)::bigint, round(coalesce(holding.average_cost, 0) * 100)::bigint,
			coalesce(holding.notes, ''), %s
		from public.holdings holding
		join public.assets asset on asset.id = holding.asset_id
		left join lateral (
			select snapshot.close_price, snapshot.provider, snapshot.freshness, snapshot.captured_at
			from public.price_snapshots snapshot where snapshot.asset_id = asset.id
			order by snapshot.captured_at desc limit 1
		) price on true
		where holding.portfolio_id = $1::uuid
		order by asset.ticker`), portfolio.ID)
	if err != nil {
		return fmt.Errorf("list portfolio holdings: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var holding Holding
		if err := scanHolding(rows, &holding); err != nil {
			return err
		}
		portfolio.Holdings = append(portfolio.Holdings, holding)
	}
	return rows.Err()
}

func loadPortfolioTransactions(ctx context.Context, db workspaceDB, portfolio *Portfolio) error {
	rows, err := db.Query(ctx, `
		select transaction.id::text, coalesce(asset.ticker, ''), transaction.transaction_type,
			transaction.transaction_date::text, round(coalesce(transaction.quantity, 0))::bigint,
			round(transaction.amount * 100)::bigint, coalesce(transaction.notes, '')
		from public.transactions transaction
		left join public.assets asset on asset.id = transaction.asset_id
		where transaction.portfolio_id = $1::uuid
		order by transaction.created_at, transaction.id`, portfolio.ID)
	if err != nil {
		return fmt.Errorf("list portfolio transactions: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var transaction Transaction
		if err := rows.Scan(&transaction.ID, &transaction.AssetTicker, &transaction.Type, &transaction.TransactionDate, &transaction.Quantity, &transaction.AmountCents, &transaction.Notes); err != nil {
			return fmt.Errorf("scan portfolio transaction: %w", err)
		}
		transaction.DisplayQuantity = formatShares(transaction.Quantity)
		transaction.DisplayAmount = formatMoney(transaction.AmountCents)
		portfolio.Transactions = append(portfolio.Transactions, transaction)
	}
	return rows.Err()
}

func loadWatchlistItems(ctx context.Context, db workspaceDB, watchlist *Watchlist) error {
	rows, err := db.Query(ctx, assetSelect(`
		select item.id::text, coalesce(item.notes, ''), %s
		from public.watchlist_items item
		join public.assets asset on asset.id = item.asset_id
		left join lateral (
			select snapshot.close_price, snapshot.provider, snapshot.freshness, snapshot.captured_at
			from public.price_snapshots snapshot where snapshot.asset_id = asset.id
			order by snapshot.captured_at desc limit 1
		) price on true
		where item.watchlist_id = $1::uuid
		order by asset.ticker`), watchlist.ID)
	if err != nil {
		return fmt.Errorf("list watchlist items: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var item WatchlistItem
		if err := scanWatchlistItem(rows, &item); err != nil {
			return err
		}
		watchlist.Items = append(watchlist.Items, item)
	}
	return rows.Err()
}

func assetSelect(query string) string {
	columns := `asset.ticker, asset.name, asset.exchange, asset.asset_type, asset.asset_class,
		coalesce(asset.sector, ''), coalesce(asset.cik, ''), coalesce(asset.country_code, ''),
		coalesce(asset.country_name, ''), coalesce(asset.region, ''), coalesce(asset.currency, ''),
		coalesce(asset.mic, ''), coalesce(asset.isin, ''), coalesce(asset.cusip, ''),
		coalesce(asset.figi, ''), coalesce(asset.provider_symbol, ''),
		coalesce(round(price.close_price * 100)::bigint, 0), coalesce(price.captured_at::text, ''),
		coalesce(price.freshness, ''), coalesce(price.provider, ''),
		coalesce((asset.metadata->>'dailyChangeBps')::integer, 0)`
	return fmt.Sprintf(query, columns)
}

type rowScanner interface {
	Scan(...any) error
}

func scanHolding(row rowScanner, holding *Holding) error {
	if err := row.Scan(&holding.ID, &holding.Quantity, &holding.AverageCostCents, &holding.Notes,
		&holding.Asset.Ticker, &holding.Asset.Name, &holding.Asset.Exchange, &holding.Asset.Type, &holding.Asset.AssetClass,
		&holding.Asset.Sector, &holding.Asset.CIK, &holding.Asset.CountryCode, &holding.Asset.Country, &holding.Asset.Region,
		&holding.Asset.Currency, &holding.Asset.MIC, &holding.Asset.ISIN, &holding.Asset.CUSIP, &holding.Asset.FIGI,
		&holding.Asset.ProviderSymbol, &holding.Asset.PriceCents, &holding.Asset.CapturedAt, &holding.Asset.Freshness,
		&holding.Asset.Provider, &holding.Asset.DailyChangeBp); err != nil {
		return fmt.Errorf("scan holding: %w", err)
	}
	holding.DisplayQuantity = formatShares(holding.Quantity)
	holding.DisplayAvgCost = formatMoney(holding.AverageCostCents)
	holding.Asset.DisplayPrice = formatMoney(holding.Asset.PriceCents)
	return nil
}

func scanWatchlistItem(row rowScanner, item *WatchlistItem) error {
	if err := row.Scan(&item.ID, &item.Notes,
		&item.Asset.Ticker, &item.Asset.Name, &item.Asset.Exchange, &item.Asset.Type, &item.Asset.AssetClass,
		&item.Asset.Sector, &item.Asset.CIK, &item.Asset.CountryCode, &item.Asset.Country, &item.Asset.Region,
		&item.Asset.Currency, &item.Asset.MIC, &item.Asset.ISIN, &item.Asset.CUSIP, &item.Asset.FIGI,
		&item.Asset.ProviderSymbol, &item.Asset.PriceCents, &item.Asset.CapturedAt, &item.Asset.Freshness,
		&item.Asset.Provider, &item.Asset.DailyChangeBp); err != nil {
		return fmt.Errorf("scan watchlist item: %w", err)
	}
	item.Asset.DisplayPrice = formatMoney(item.Asset.PriceCents)
	return nil
}

func normalizeCurrency(value string) string {
	value = strings.ToUpper(strings.TrimSpace(value))
	if value == "" {
		return "USD"
	}
	return value
}

func normalizeAssetClass(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	allowed := map[string]bool{
		"equity": true, "preferred_stock": true, "etf": true, "mutual_fund": true, "closed_end_fund": true,
		"money_market_fund": true, "index": true, "bond": true, "government_bond": true, "treasury": true,
		"corporate_bond": true, "municipal_bond": true, "certificate_of_deposit": true, "reit": true,
		"real_estate": true, "private_equity": true, "venture_capital": true, "private_debt": true,
		"option": true, "warrant": true, "future": true, "forward": true, "swap": true, "forex": true,
		"commodity": true, "structured_product": true, "annuity": true, "insurance": true, "pension": true,
		"cash": true, "cryptocurrency": true, "stablecoin": true, "tokenized_asset": true, "other": true,
	}
	if !allowed[value] {
		return "other"
	}
	return value
}

func fallback(value, fallbackValue string) string {
	if strings.TrimSpace(value) == "" {
		return fallbackValue
	}
	return strings.TrimSpace(value)
}

func maxInt64(value, minimum int64) int64 {
	if value < minimum {
		return minimum
	}
	return value
}
