create table public.research_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid not null references public.research_workspaces(id) on delete cascade,
  retry_of_run_id uuid references public.research_analysis_runs(id) on delete set null,
  workflow text not null check (workflow in ('earnings_review')),
  workflow_version text not null,
  status text not null default 'queued'
    check (
      status in (
        'queued',
        'retrieving',
        'generating',
        'validating',
        'repairing',
        'completed',
        'partial',
        'cancelled',
        'failed'
      )
    ),
  prompt_sha256 text not null check (prompt_sha256 ~ '^[0-9a-f]{64}$'),
  prompt_version text not null,
  schema_version text not null,
  provider text not null,
  model text not null,
  mode text not null check (mode in ('deterministic', 'live', 'degraded')),
  selected_document_ids uuid[] not null default '{}'::uuid[]
    check (cardinality(selected_document_ids) <= 20),
  retrieval_run_id uuid references public.research_retrieval_runs(id) on delete set null,
  retrieved_chunk_ids uuid[] not null default '{}'::uuid[]
    check (cardinality(retrieved_chunk_ids) <= 50),
  output_json jsonb,
  validation_issues jsonb not null default '[]'::jsonb
    check (jsonb_typeof(validation_issues) = 'array'),
  repair_attempted boolean not null default false,
  repair_succeeded boolean not null default false,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),
  estimated_cost_usd numeric(18, 8)
    check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  stage_timings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(stage_timings) = 'object'),
  total_latency_ms integer check (total_latency_ms is null or total_latency_ms >= 0),
  event_count integer not null default 0 check (event_count >= 0),
  last_event_sequence integer not null default 0 check (last_event_sequence >= 0),
  cancel_requested_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    not repair_succeeded
    or repair_attempted
  ),
  check (
    status not in ('completed', 'partial', 'cancelled', 'failed')
    or completed_at is not null
  ),
  check (
    status <> 'cancelled'
    or cancel_requested_at is not null
  )
);

create index research_analysis_runs_user_created_idx
  on public.research_analysis_runs(user_id, created_at desc);

create index research_analysis_runs_workspace_created_idx
  on public.research_analysis_runs(workspace_id, created_at desc);

create index research_analysis_runs_retry_of_run_idx
  on public.research_analysis_runs(retry_of_run_id)
  where retry_of_run_id is not null;

create index research_analysis_runs_active_idx
  on public.research_analysis_runs(user_id, updated_at desc)
  where status in ('queued', 'retrieving', 'generating', 'validating', 'repairing');

create trigger research_analysis_runs_updated_at
  before update on public.research_analysis_runs
  for each row execute function public.set_updated_at();

alter table public.research_analysis_runs enable row level security;
alter table public.research_analysis_runs force row level security;

create policy research_analysis_runs_own_rows
  on public.research_analysis_runs
  for all
  to aperture_api
  using (
    user_id = public.current_profile_id()
    and exists (
      select 1
      from public.research_workspaces workspace
      where workspace.id = research_analysis_runs.workspace_id
        and workspace.user_id = public.current_profile_id()
    )
  )
  with check (
    user_id = public.current_profile_id()
    and exists (
      select 1
      from public.research_workspaces workspace
      where workspace.id = research_analysis_runs.workspace_id
        and workspace.user_id = public.current_profile_id()
    )
  );

grant select, insert, update on public.research_analysis_runs to aperture_api;
grant select, insert, update on public.research_analysis_runs to service_role;
