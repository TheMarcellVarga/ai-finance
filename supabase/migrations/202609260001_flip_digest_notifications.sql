-- Confirmed market flip digests are owned by the finance API. Users opt in.
create table public.flip_digest_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default false,
  direction text not null default 'bull' check (direction in ('bull', 'bear', 'both')),
  cadence text not null default 'daily' check (cadence in ('daily', 'weekly')),
  email_enabled boolean not null default true,
  in_app_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not enabled or email_enabled or in_app_enabled)
);

create table public.flip_digest_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  direction text not null check (direction in ('bull', 'bear', 'both')),
  cadence text not null check (cadence in ('daily', 'weekly')),
  entries jsonb not null,
  coverage jsonb not null,
  in_app_visible boolean not null,
  email_enabled boolean not null,
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, period_end, cadence),
  check (jsonb_typeof(entries) = 'array'),
  check (jsonb_typeof(coverage) = 'object'),
  check (period_end > period_start)
);

create index flip_digest_notifications_user_created_idx
  on public.flip_digest_notifications (user_id, created_at desc);
create index flip_digest_preferences_enabled_idx
  on public.flip_digest_preferences (enabled) where enabled;

create trigger flip_digest_preferences_updated_at before update on public.flip_digest_preferences
  for each row execute function public.set_updated_at();

alter table public.flip_digest_preferences enable row level security;
alter table public.flip_digest_notifications enable row level security;
revoke all on public.flip_digest_preferences from anon, authenticated;
revoke all on public.flip_digest_notifications from anon, authenticated;

create policy flip_digest_preferences_own on public.flip_digest_preferences
  for all using (user_id = public.current_profile_id())
  with check (user_id = public.current_profile_id());
create policy flip_digest_notifications_own on public.flip_digest_notifications
  for select using (user_id = public.current_profile_id());

grant select, insert, update on public.flip_digest_preferences to aperture_api;
grant select, insert, update on public.flip_digest_notifications to aperture_api;
