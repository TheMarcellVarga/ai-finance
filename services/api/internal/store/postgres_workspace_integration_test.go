package store

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestPostgresWorkspacePersistsAcrossStoreInstances(t *testing.T) {
	databaseURL := os.Getenv("WORKSPACE_TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("WORKSPACE_TEST_DATABASE_URL is not configured")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		t.Fatal(err)
	}

	clerkUserID := fmt.Sprintf("workspace_persistence_test_%d", time.Now().UnixNano())
	defer func() {
		_, _ = pool.Exec(ctx, `delete from public.profiles where clerk_user_id = $1`, clerkUserID)
	}()
	asset := Asset{
		Ticker: "AAPL", Name: "Apple", Exchange: "NASDAQ", Type: "equity", AssetClass: "equity",
		Sector: "Technology", Currency: "USD", PriceCents: 21025, Provider: "integration-test",
		Freshness: "test", CapturedAt: time.Now().UTC().Format(time.RFC3339), DailyChangeBp: 125,
	}

	first := NewPostgresWorkspaceStore(pool)
	portfolio, err := first.CreatePortfolio(ctx, clerkUserID, "Persistence check", "USD", []Holding{{
		Asset: asset, Quantity: 2, AverageCostCents: 19000,
	}})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := first.CreateWatchlist(ctx, clerkUserID, "Research", []Asset{asset}); err != nil {
		t.Fatal(err)
	}

	second := NewPostgresWorkspaceStore(pool)
	loaded, err := second.GetPortfolio(ctx, clerkUserID, portfolio.ID)
	if err != nil {
		t.Fatal(err)
	}
	if loaded.Summary.TotalValueCents != 42050 || len(loaded.Holdings) != 1 {
		t.Fatalf("unexpected persisted portfolio: %#v", loaded)
	}
	watchlists, err := second.ListWatchlists(ctx, clerkUserID)
	if err != nil {
		t.Fatal(err)
	}
	if len(watchlists) != 1 || len(watchlists[0].Items) != 1 || watchlists[0].Items[0].Asset.Ticker != "AAPL" {
		t.Fatalf("unexpected persisted watchlist: %#v", watchlists)
	}
}
