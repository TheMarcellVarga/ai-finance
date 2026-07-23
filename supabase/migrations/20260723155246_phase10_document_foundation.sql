do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'aperture_api') then
    create role aperture_api nologin noinherit nobypassrls;
  end if;
end
$$;

grant aperture_api to postgres;
grant usage on schema public to aperture_api;
grant execute on function public.current_profile_id() to aperture_api;

create table if not exists public.research_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  status text not null default 'active' check (status in ('active', 'archived')),
  model_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.research_documents
  add column if not exists workspace_id uuid references public.research_workspaces(id) on delete cascade,
  add column if not exists uploaded_by uuid references public.profiles(id) on delete set null,
  add column if not exists original_filename text,
  add column if not exists mime_type text,
  add column if not exists byte_size bigint,
  add column if not exists sha256 text,
  add column if not exists storage_bucket text,
  add column if not exists storage_object_key text,
  add column if not exists status text not null default 'ready',
  add column if not exists attempt_count integer not null default 0,
  add column if not exists error_code text,
  add column if not exists error_message text,
  add column if not exists page_count integer,
  add column if not exists uploaded_at timestamptz,
  add column if not exists parsed_at timestamptz;

alter table public.research_documents
  alter column source_url drop not null;

alter table public.research_documents
  drop constraint if exists research_documents_status_check,
  add constraint research_documents_status_check
    check (status in ('uploading', 'queued', 'processing', 'ready', 'failed', 'deleted')),
  drop constraint if exists research_documents_mime_type_check,
  add constraint research_documents_mime_type_check
    check (mime_type is null or mime_type in ('application/pdf', 'text/plain')),
  drop constraint if exists research_documents_byte_size_check,
  add constraint research_documents_byte_size_check
    check (byte_size is null or (byte_size > 0 and byte_size <= 10485760)),
  drop constraint if exists research_documents_page_count_check,
  add constraint research_documents_page_count_check
    check (page_count is null or (page_count >= 0 and page_count <= 750)),
  drop constraint if exists research_documents_attempt_count_check,
  add constraint research_documents_attempt_count_check
    check (attempt_count >= 0),
  drop constraint if exists research_documents_sha256_check,
  add constraint research_documents_sha256_check
    check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  drop constraint if exists research_documents_error_message_check,
  add constraint research_documents_error_message_check
    check (error_message is null or char_length(error_message) <= 500);

create table if not exists public.document_pages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.research_documents(id) on delete cascade,
  workspace_id uuid not null references public.research_workspaces(id) on delete cascade,
  page_number integer not null check (page_number between 1 and 750),
  normalized_text text not null check (char_length(normalized_text) <= 250000),
  text_sha256 text not null check (text_sha256 ~ '^[0-9a-f]{64}$'),
  character_count integer not null check (character_count >= 0 and character_count <= 250000),
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, page_number)
);

create table if not exists public.document_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.research_documents(id) on delete cascade,
  workspace_id uuid not null references public.research_workspaces(id) on delete cascade,
  job_type text not null default 'parse' check (job_type in ('parse')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'succeeded', 'failed', 'canceled')),
  idempotency_key text not null unique,
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 10),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  lease_owner text,
  lease_expires_at timestamptz,
  available_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  error_message text check (error_message is null or char_length(error_message) <= 500),
  stage_timings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.research_chunks
  add column if not exists workspace_id uuid references public.research_workspaces(id) on delete cascade,
  add column if not exists page_number integer,
  add column if not exists sequence integer,
  add column if not exists heading_path text[],
  add column if not exists stable_key text,
  add column if not exists content_sha256 text,
  add column if not exists embedding_model text,
  add column if not exists embedding_dimensions integer,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists research_workspaces_user_updated_idx
  on public.research_workspaces(user_id, updated_at desc);
create index if not exists research_documents_workspace_uploaded_idx
  on public.research_documents(workspace_id, uploaded_at desc)
  where workspace_id is not null;
create unique index if not exists research_documents_storage_object_key_idx
  on public.research_documents(storage_bucket, storage_object_key)
  where storage_bucket is not null and storage_object_key is not null;
create index if not exists document_pages_workspace_document_page_idx
  on public.document_pages(workspace_id, document_id, page_number);
create index if not exists document_processing_jobs_claim_idx
  on public.document_processing_jobs(status, available_at, created_at)
  where status = 'queued';
create unique index if not exists document_processing_jobs_one_active_idx
  on public.document_processing_jobs(document_id)
  where status in ('queued', 'processing');
create index if not exists research_chunks_workspace_document_page_idx
  on public.research_chunks(workspace_id, document_id, page_number, sequence)
  where workspace_id is not null;

create trigger research_workspaces_updated_at
  before update on public.research_workspaces
  for each row execute function public.set_updated_at();
create trigger document_pages_updated_at
  before update on public.document_pages
  for each row execute function public.set_updated_at();
create trigger document_processing_jobs_updated_at
  before update on public.document_processing_jobs
  for each row execute function public.set_updated_at();
create trigger research_chunks_updated_at
  before update on public.research_chunks
  for each row execute function public.set_updated_at();

alter table public.research_workspaces enable row level security;
alter table public.research_workspaces force row level security;
alter table public.research_documents force row level security;
alter table public.document_pages enable row level security;
alter table public.document_pages force row level security;
alter table public.document_processing_jobs enable row level security;
alter table public.document_processing_jobs force row level security;
alter table public.research_chunks force row level security;

drop policy if exists research_documents_read_all on public.research_documents;
drop policy if exists research_chunks_read_all on public.research_chunks;

create policy research_workspaces_own_rows
  on public.research_workspaces
  for all
  to aperture_api
  using (user_id = public.current_profile_id())
  with check (user_id = public.current_profile_id());

create policy research_documents_own_rows
  on public.research_documents
  for all
  to aperture_api
  using (
    exists (
      select 1
      from public.research_workspaces workspace
      where workspace.id = research_documents.workspace_id
        and workspace.user_id = public.current_profile_id()
    )
  )
  with check (
    exists (
      select 1
      from public.research_workspaces workspace
      where workspace.id = research_documents.workspace_id
        and workspace.user_id = public.current_profile_id()
    )
  );

create policy document_pages_own_rows
  on public.document_pages
  for all
  to aperture_api
  using (
    exists (
      select 1
      from public.research_workspaces workspace
      where workspace.id = document_pages.workspace_id
        and workspace.user_id = public.current_profile_id()
    )
  )
  with check (
    exists (
      select 1
      from public.research_workspaces workspace
      where workspace.id = document_pages.workspace_id
        and workspace.user_id = public.current_profile_id()
    )
  );

create policy research_chunks_own_rows
  on public.research_chunks
  for all
  to aperture_api
  using (
    exists (
      select 1
      from public.research_workspaces workspace
      where workspace.id = research_chunks.workspace_id
        and workspace.user_id = public.current_profile_id()
    )
  )
  with check (
    exists (
      select 1
      from public.research_workspaces workspace
      where workspace.id = research_chunks.workspace_id
        and workspace.user_id = public.current_profile_id()
    )
  );

create policy document_processing_jobs_service_only
  on public.document_processing_jobs
  for all
  using (false)
  with check (false);

grant select, insert, update, delete on public.profiles to aperture_api;
grant select, insert, update, delete on public.research_workspaces to aperture_api;
grant select, insert, update, delete on public.research_documents to aperture_api;
grant select, insert, update, delete on public.document_pages to aperture_api;
grant select, insert, update, delete on public.research_chunks to aperture_api;
grant select, insert, update, delete on public.document_processing_jobs to aperture_api;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'research-documents',
  'research-documents',
  false,
  10485760,
  array['application/pdf', 'text/plain']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
