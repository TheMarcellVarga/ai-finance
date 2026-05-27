alter table public.subscriptions
  add column if not exists stripe_price_id text,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists entitlements jsonb not null default '{}'::jsonb,
  add column if not exists last_webhook_event_id text;

create unique index if not exists subscriptions_last_webhook_event_id_idx
  on public.subscriptions(last_webhook_event_id)
  where last_webhook_event_id is not null;

create index if not exists subscriptions_status_period_idx
  on public.subscriptions(status, current_period_end);

create index if not exists usage_events_feature_period_idx
  on public.usage_events(feature, billing_period, created_at desc);

create table if not exists public.webhook_events (
  id text primary key,
  provider text not null check (provider in ('stripe', 'clerk')),
  event_type text not null,
  processed_at timestamptz not null default now(),
  status text not null,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.webhook_events enable row level security;

drop policy if exists webhook_events_service_only on public.webhook_events;
create policy webhook_events_service_only on public.webhook_events for all using (false) with check (false);
