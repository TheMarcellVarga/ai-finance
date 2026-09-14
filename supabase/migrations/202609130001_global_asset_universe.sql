-- Global asset-universe extension.
-- Provider availability remains the source of truth for live prices; this
-- migration only broadens the normalized metadata boundary.

alter table public.assets
  add column if not exists asset_class text;

alter table public.assets
  add column if not exists country_code text,
  add column if not exists country_name text,
  add column if not exists region text,
  add column if not exists currency text,
  add column if not exists mic text,
  add column if not exists isin text,
  add column if not exists cusip text,
  add column if not exists figi text,
  add column if not exists provider_symbol text;

update public.assets
set asset_class = case
  when asset_type = 'equity' then 'equity'
  when asset_type = 'etf' then 'etf'
  else 'other'
end
where asset_class is null or btrim(asset_class) = '';

alter table public.assets
  alter column asset_class set default 'other';

alter table public.assets
  alter column asset_class set not null;

alter table public.assets
  drop constraint if exists assets_asset_type_check;

alter table public.assets
  add constraint assets_asset_type_check check (asset_type = any (array[
    'equity', 'preferred_stock', 'etf', 'mutual_fund', 'closed_end_fund',
    'money_market_fund', 'index', 'bond', 'government_bond', 'treasury',
    'corporate_bond', 'municipal_bond', 'certificate_of_deposit', 'reit',
    'real_estate', 'private_equity', 'venture_capital', 'private_debt',
    'option', 'warrant', 'future', 'forward', 'swap', 'forex', 'commodity',
    'structured_product', 'annuity', 'insurance', 'pension', 'cash',
    'cryptocurrency', 'stablecoin', 'tokenized_asset', 'other'
  ]));

alter table public.assets
  add constraint assets_asset_class_check check (asset_class = any (array[
    'equity', 'preferred_stock', 'etf', 'mutual_fund', 'closed_end_fund',
    'money_market_fund', 'index', 'bond', 'government_bond', 'treasury',
    'corporate_bond', 'municipal_bond', 'certificate_of_deposit', 'reit',
    'real_estate', 'private_equity', 'venture_capital', 'private_debt',
    'option', 'warrant', 'future', 'forward', 'swap', 'forex', 'commodity',
    'structured_product', 'annuity', 'insurance', 'pension', 'cash',
    'cryptocurrency', 'stablecoin', 'tokenized_asset', 'other'
  ]));

create index if not exists assets_asset_class_idx on public.assets (asset_class);
create index if not exists assets_country_code_idx on public.assets (country_code);
create index if not exists assets_region_idx on public.assets (region);
create index if not exists assets_currency_idx on public.assets (currency);
create index if not exists assets_exchange_idx on public.assets (exchange);

comment on column public.assets.asset_class is 'Canonical global asset taxonomy ID; provider labels are normalized at ingestion.';
comment on column public.assets.country_code is 'ISO 3166-1 alpha-2 country or territory code supplied by the provider.';
comment on column public.assets.currency is 'ISO 4217 alpha-3 quote currency supplied by the provider.';
