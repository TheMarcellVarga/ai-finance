insert into public.assets (ticker, name, exchange, asset_type, sector, industry, cik, metadata)
values
  ('AAPL', 'Apple Inc.', 'NASDAQ', 'equity', 'Technology', 'Consumer Electronics', '0000320193', '{"demo_universe": true}'::jsonb),
  ('MSFT', 'Microsoft Corporation', 'NASDAQ', 'equity', 'Technology', 'Software Infrastructure', '0000789019', '{"demo_universe": true}'::jsonb),
  ('NVDA', 'NVIDIA Corporation', 'NASDAQ', 'equity', 'Technology', 'Semiconductors', '0001045810', '{"demo_universe": true}'::jsonb),
  ('JPM', 'JPMorgan Chase & Co.', 'NYSE', 'equity', 'Financial Services', 'Banks - Diversified', '0000019617', '{"demo_universe": true}'::jsonb),
  ('VTI', 'Vanguard Total Stock Market ETF', 'NYSEARCA', 'etf', 'Diversified', 'Broad Market ETF', null, '{"demo_universe": true}'::jsonb),
  ('BND', 'Vanguard Total Bond Market ETF', 'NASDAQ', 'etf', 'Fixed Income', 'Bond ETF', null, '{"demo_universe": true}'::jsonb)
on conflict (ticker) do update set
  name = excluded.name,
  exchange = excluded.exchange,
  asset_type = excluded.asset_type,
  sector = excluded.sector,
  industry = excluded.industry,
  cik = excluded.cik,
  metadata = public.assets.metadata || excluded.metadata,
  updated_at = now();

insert into public.price_snapshots (asset_id, captured_at, close_price, volume, provider, freshness)
select id, timestamp '2026-05-22 21:00:00+00', price.close_price, price.volume, 'demo-seed', 'deterministic-demo-data'
from public.assets
join (
  values
    ('AAPL', 195.27::numeric, 48210000::bigint),
    ('MSFT', 460.39::numeric, 21850000::bigint),
    ('NVDA', 135.57::numeric, 257900000::bigint),
    ('JPM', 271.12::numeric, 10240000::bigint),
    ('VTI', 305.18::numeric, 3100000::bigint),
    ('BND', 72.44::numeric, 6800000::bigint)
) as price(ticker, close_price, volume) on price.ticker = public.assets.ticker
on conflict (asset_id, captured_at, provider) do update set
  close_price = excluded.close_price,
  volume = excluded.volume,
  freshness = excluded.freshness;

insert into public.challenges (slug, title, description, reward_type)
values
  ('read-risk-brief', 'Read a risk brief', 'Review an AI risk explanation and save one assumption for later comparison.', 'research_discipline'),
  ('diversification-check', 'Diversification check', 'Compare sector and asset-class concentration before changing a portfolio scenario.', 'diversification_review')
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  reward_type = excluded.reward_type;

insert into public.achievements (slug, title, description)
values
  ('first-cited-brief', 'First cited brief', 'Saved a research brief with source references.'),
  ('assumption-reviewer', 'Assumption reviewer', 'Reviewed portfolio assumptions without direct buy/sell framing.')
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description;
