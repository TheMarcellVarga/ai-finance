alter table public.research_chunks
  add column if not exists chunker_version text,
  add column if not exists character_start integer,
  add column if not exists character_end integer,
  add column if not exists embedding_provider text,
  add column if not exists embedding_version text,
  add column if not exists embedded_at timestamptz,
  add column if not exists search_vector tsvector
    generated always as (to_tsvector('english', coalesce(section_label, '') || ' ' || chunk_text)) stored;

-- Retire the Phase 6 deterministic fixture marker. Those legacy rows are not
-- workspace-owned and remain excluded from the owner-scoped retrieval index.
update public.research_chunks
set embedding_status = 'pending'
where embedding_status not in ('pending', 'ready', 'failed');

alter table public.research_chunks
  drop constraint if exists research_chunks_page_number_check,
  add constraint research_chunks_page_number_check
    check (page_number is null or page_number between 1 and 750),
  drop constraint if exists research_chunks_sequence_check,
  add constraint research_chunks_sequence_check
    check (sequence is null or sequence >= 0),
  drop constraint if exists research_chunks_character_range_check,
  add constraint research_chunks_character_range_check
    check (
      (character_start is null and character_end is null)
      or (
        character_start >= 0
        and character_end > character_start
        and character_end <= 250000
      )
    ),
  drop constraint if exists research_chunks_content_sha256_check,
  add constraint research_chunks_content_sha256_check
    check (content_sha256 is null or content_sha256 ~ '^[0-9a-f]{64}$'),
  drop constraint if exists research_chunks_embedding_dimensions_check,
  add constraint research_chunks_embedding_dimensions_check
    check (embedding_dimensions is null or embedding_dimensions = 1536),
  drop constraint if exists research_chunks_embedding_status_check,
  add constraint research_chunks_embedding_status_check
    check (embedding_status in ('pending', 'ready', 'failed'));

create unique index if not exists research_chunks_stable_version_idx
  on public.research_chunks(document_id, chunker_version, stable_key)
  where chunker_version is not null and stable_key is not null;

create index if not exists research_chunks_search_vector_idx
  on public.research_chunks using gin(search_vector);

create index if not exists research_chunks_embedding_hnsw_idx
  on public.research_chunks
  using hnsw (embedding vector_cosine_ops)
  where embedding is not null and embedding_status = 'ready';

create index if not exists research_chunks_retrieval_filter_idx
  on public.research_chunks(
    workspace_id,
    embedding_provider,
    embedding_model,
    embedding_version,
    embedding_dimensions
  )
  where embedding_status = 'ready';

create table if not exists public.research_retrieval_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid not null references public.research_workspaces(id) on delete cascade,
  query_sha256 text not null check (query_sha256 ~ '^[0-9a-f]{64}$'),
  selected_document_ids uuid[] not null default '{}'::uuid[]
    check (cardinality(selected_document_ids) <= 20),
  requested_limit integer not null check (requested_limit between 1 and 20),
  candidate_count integer not null check (candidate_count >= 0),
  returned_count integer not null check (
    returned_count >= 0 and returned_count <= requested_limit
  ),
  result_chunk_ids uuid[] not null default '{}'::uuid[],
  chunker_version text not null,
  embedding_provider text not null,
  embedding_model text not null,
  embedding_version text not null,
  embedding_dimensions integer not null check (embedding_dimensions = 1536),
  filters jsonb not null default '{}'::jsonb,
  stage_timings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists research_retrieval_runs_workspace_created_idx
  on public.research_retrieval_runs(workspace_id, created_at desc);

create index if not exists research_retrieval_runs_user_created_idx
  on public.research_retrieval_runs(user_id, created_at desc);

alter table public.research_retrieval_runs enable row level security;
alter table public.research_retrieval_runs force row level security;

create policy research_retrieval_runs_own_rows
  on public.research_retrieval_runs
  for all
  to aperture_api
  using (
    user_id = public.current_profile_id()
    and exists (
      select 1
      from public.research_workspaces workspace
      where workspace.id = research_retrieval_runs.workspace_id
        and workspace.user_id = public.current_profile_id()
    )
  )
  with check (
    user_id = public.current_profile_id()
    and exists (
      select 1
      from public.research_workspaces workspace
      where workspace.id = research_retrieval_runs.workspace_id
        and workspace.user_id = public.current_profile_id()
    )
  );

grant select, insert on public.research_retrieval_runs to aperture_api;
