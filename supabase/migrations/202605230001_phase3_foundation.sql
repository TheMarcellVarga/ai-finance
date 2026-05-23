create extension if not exists pgcrypto;
create extension if not exists vector;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_profile_id', true), '')::uuid;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  display_name text,
  role text not null default 'user',
  onboarding_state text not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free',
  status text not null default 'inactive',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  ticker text not null unique,
  name text not null,
  exchange text not null,
  asset_type text not null check (asset_type in ('equity', 'etf')),
  sector text,
  industry text,
  cik text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.price_snapshots (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  captured_at timestamptz not null,
  open_price numeric(24, 8),
  high_price numeric(24, 8),
  low_price numeric(24, 8),
  close_price numeric(24, 8) not null,
  volume bigint,
  provider text not null,
  freshness text not null default 'cached',
  created_at timestamptz not null default now(),
  unique (asset_id, captured_at, provider)
);

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  base_currency text not null default 'USD',
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  asset_id uuid not null references public.assets(id),
  quantity numeric(24, 8) not null check (quantity >= 0),
  average_cost numeric(24, 8),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_id, asset_id)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  holding_id uuid references public.holdings(id) on delete set null,
  asset_id uuid references public.assets(id),
  transaction_type text not null check (transaction_type in ('buy', 'sell', 'deposit', 'withdrawal', 'dividend')),
  transaction_date date not null,
  quantity numeric(24, 8),
  amount numeric(24, 8) not null,
  currency text not null default 'USD',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references public.watchlists(id) on delete cascade,
  asset_id uuid not null references public.assets(id),
  notes text,
  created_at timestamptz not null default now(),
  unique (watchlist_id, asset_id)
);

create table if not exists public.research_documents (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references public.assets(id),
  source_type text not null,
  title text not null,
  source_url text not null,
  filing_accession text,
  fetched_text text,
  embedding_status text not null default 'pending',
  fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.research_documents(id) on delete cascade,
  chunk_text text not null,
  embedding vector(1536),
  source_locator text,
  section_label text,
  token_count integer,
  embedding_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  surface text not null,
  linked_portfolio_id uuid references public.portfolios(id) on delete set null,
  linked_watchlist_id uuid references public.watchlists(id) on delete set null,
  linked_asset_id uuid references public.assets(id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ai_threads(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant', 'tool')),
  content text not null,
  tool_calls jsonb not null default '[]'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  safety_labels text[] not null default array[]::text[],
  created_at timestamptz not null default now()
);

create table if not exists public.ai_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset_id uuid references public.assets(id) on delete set null,
  portfolio_id uuid references public.portfolios(id) on delete set null,
  prompt_hash text not null,
  model text not null,
  output_json jsonb not null,
  citations jsonb not null default '[]'::jsonb,
  token_cost numeric(18, 8),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_tool_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  thread_id uuid references public.ai_threads(id) on delete set null,
  tool_name text not null,
  validated_input_json jsonb not null,
  output_summary jsonb not null default '{}'::jsonb,
  latency_ms integer,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  feature text not null,
  fixture_name text not null,
  prompt_hash text not null,
  expected_behavior text not null,
  result text not null,
  model text,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  target_amount numeric(24, 8) not null,
  base_currency text not null default 'USD',
  deadline date,
  risk_preference text not null default 'balanced',
  contribution_cadence text,
  status text not null default 'draft',
  assumptions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null,
  target_date date,
  target_amount numeric(24, 8),
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  reward_type text not null default 'education',
  created_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  ip_hash text,
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null,
  count integer not null default 1 check (count > 0),
  billing_period text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_clerk_user_id_idx on public.profiles(clerk_user_id);
create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists assets_ticker_idx on public.assets(ticker);
create index if not exists price_snapshots_asset_captured_idx on public.price_snapshots(asset_id, captured_at desc);
create index if not exists portfolios_user_id_idx on public.portfolios(user_id);
create index if not exists holdings_portfolio_id_idx on public.holdings(portfolio_id);
create index if not exists transactions_portfolio_date_idx on public.transactions(portfolio_id, transaction_date desc);
create index if not exists watchlists_user_id_idx on public.watchlists(user_id);
create index if not exists research_documents_asset_id_idx on public.research_documents(asset_id);
create index if not exists research_chunks_document_id_idx on public.research_chunks(document_id);
create index if not exists ai_threads_user_id_idx on public.ai_threads(user_id);
create index if not exists ai_tool_runs_user_id_idx on public.ai_tool_runs(user_id);
create index if not exists goals_user_id_idx on public.goals(user_id);
create index if not exists audit_logs_user_created_idx on public.audit_logs(user_id, created_at desc);
create index if not exists usage_events_user_period_idx on public.usage_events(user_id, billing_period, feature);

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger assets_updated_at before update on public.assets for each row execute function public.set_updated_at();
create trigger portfolios_updated_at before update on public.portfolios for each row execute function public.set_updated_at();
create trigger holdings_updated_at before update on public.holdings for each row execute function public.set_updated_at();
create trigger watchlists_updated_at before update on public.watchlists for each row execute function public.set_updated_at();
create trigger research_documents_updated_at before update on public.research_documents for each row execute function public.set_updated_at();
create trigger ai_threads_updated_at before update on public.ai_threads for each row execute function public.set_updated_at();
create trigger goals_updated_at before update on public.goals for each row execute function public.set_updated_at();
create trigger goal_milestones_updated_at before update on public.goal_milestones for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.assets enable row level security;
alter table public.price_snapshots enable row level security;
alter table public.portfolios enable row level security;
alter table public.holdings enable row level security;
alter table public.transactions enable row level security;
alter table public.watchlists enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.research_documents enable row level security;
alter table public.research_chunks enable row level security;
alter table public.ai_threads enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_briefs enable row level security;
alter table public.ai_tool_runs enable row level security;
alter table public.ai_evaluations enable row level security;
alter table public.goals enable row level security;
alter table public.goal_milestones enable row level security;
alter table public.challenges enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.audit_logs enable row level security;
alter table public.usage_events enable row level security;

create policy profiles_own_rows on public.profiles for all using (id = public.current_profile_id()) with check (id = public.current_profile_id());
create policy subscriptions_own_rows on public.subscriptions for all using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
create policy assets_read_all on public.assets for select using (true);
create policy price_snapshots_read_all on public.price_snapshots for select using (true);
create policy portfolios_own_rows on public.portfolios for all using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
create policy holdings_own_rows on public.holdings for all using (exists (select 1 from public.portfolios p where p.id = portfolio_id and p.user_id = public.current_profile_id())) with check (exists (select 1 from public.portfolios p where p.id = portfolio_id and p.user_id = public.current_profile_id()));
create policy transactions_own_rows on public.transactions for all using (exists (select 1 from public.portfolios p where p.id = portfolio_id and p.user_id = public.current_profile_id())) with check (exists (select 1 from public.portfolios p where p.id = portfolio_id and p.user_id = public.current_profile_id()));
create policy watchlists_own_rows on public.watchlists for all using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
create policy watchlist_items_own_rows on public.watchlist_items for all using (exists (select 1 from public.watchlists w where w.id = watchlist_id and w.user_id = public.current_profile_id())) with check (exists (select 1 from public.watchlists w where w.id = watchlist_id and w.user_id = public.current_profile_id()));
create policy ai_threads_own_rows on public.ai_threads for all using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
create policy ai_messages_own_rows on public.ai_messages for all using (exists (select 1 from public.ai_threads t where t.id = thread_id and t.user_id = public.current_profile_id())) with check (exists (select 1 from public.ai_threads t where t.id = thread_id and t.user_id = public.current_profile_id()));
create policy ai_briefs_own_rows on public.ai_briefs for all using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
create policy ai_tool_runs_own_rows on public.ai_tool_runs for all using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
create policy goals_own_rows on public.goals for all using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
create policy goal_milestones_own_rows on public.goal_milestones for all using (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = public.current_profile_id())) with check (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = public.current_profile_id()));
create policy user_achievements_own_rows on public.user_achievements for all using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
create policy audit_logs_own_rows on public.audit_logs for select using (user_id = public.current_profile_id());
create policy usage_events_own_rows on public.usage_events for all using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
create policy challenges_read_all on public.challenges for select using (true);
create policy achievements_read_all on public.achievements for select using (true);
create policy research_documents_read_all on public.research_documents for select using (true);
create policy research_chunks_read_all on public.research_chunks for select using (true);
create policy ai_evaluations_service_only on public.ai_evaluations for select using (false);
