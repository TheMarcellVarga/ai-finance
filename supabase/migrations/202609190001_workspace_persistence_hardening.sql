-- Portfolio and watchlist records are owned by the Go finance API. The browser
-- never talks to these tables directly, so remove Data API grants while keeping
-- RLS enabled as defense in depth for any future grant changes.

alter table public.portfolios enable row level security;
alter table public.holdings enable row level security;
alter table public.transactions enable row level security;
alter table public.watchlists enable row level security;
alter table public.watchlist_items enable row level security;

revoke all on table public.portfolios from anon, authenticated;
revoke all on table public.holdings from anon, authenticated;
revoke all on table public.transactions from anon, authenticated;
revoke all on table public.watchlists from anon, authenticated;
revoke all on table public.watchlist_items from anon, authenticated;

create index if not exists holdings_asset_id_idx
  on public.holdings (asset_id);

create index if not exists watchlist_items_watchlist_id_idx
  on public.watchlist_items (watchlist_id);

create index if not exists watchlist_items_asset_id_idx
  on public.watchlist_items (asset_id);
