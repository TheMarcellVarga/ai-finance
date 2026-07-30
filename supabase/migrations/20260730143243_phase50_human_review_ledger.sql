create table public.research_analysis_review_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid not null references public.research_workspaces(id) on delete cascade,
  analysis_run_id uuid not null references public.research_analysis_runs(id) on delete cascade,
  section_key text not null
    check (
      section_key in (
        'executive_summary',
        'operating_signals',
        'risk_factors',
        'questions_for_review'
      )
    ),
  event_type text not null
    check (
      event_type in (
        'edit_saved',
        'accepted',
        'rejected',
        'citation_flagged'
      )
    ),
  content_event_id uuid,
  section_title text check (section_title is null or char_length(section_title) between 1 and 160),
  section_body text check (section_body is null or char_length(section_body) between 1 and 12000),
  note text check (note is null or char_length(note) between 1 and 2000),
  citation_chunk_id uuid,
  output_sha256 text not null check (output_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (user_id, request_id),
  unique (id, user_id, workspace_id, analysis_run_id, section_key),
  foreign key (
    content_event_id,
    user_id,
    workspace_id,
    analysis_run_id,
    section_key
  ) references public.research_analysis_review_events (
    id,
    user_id,
    workspace_id,
    analysis_run_id,
    section_key
  ),
  check (
    (
      event_type = 'edit_saved'
      and content_event_id is null
      and section_title is not null
      and section_body is not null
      and note is null
      and citation_chunk_id is null
    )
    or (
      event_type in ('accepted', 'rejected')
      and section_title is null
      and section_body is null
      and citation_chunk_id is null
    )
    or (
      event_type = 'citation_flagged'
      and content_event_id is null
      and section_title is null
      and section_body is null
      and note is not null
      and citation_chunk_id is not null
    )
  )
);

create index research_analysis_review_events_run_created_idx
  on public.research_analysis_review_events (
    user_id,
    workspace_id,
    analysis_run_id,
    created_at,
    id
  );

create index research_analysis_review_events_content_event_idx
  on public.research_analysis_review_events (content_event_id)
  where content_event_id is not null;

create function public.prevent_research_analysis_output_replacement()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.output_json is not null and new.output_json is distinct from old.output_json then
    raise exception 'research analysis raw output is immutable';
  end if;
  return new;
end;
$$;

create trigger research_analysis_runs_immutable_output
  before update of output_json on public.research_analysis_runs
  for each row execute function public.prevent_research_analysis_output_replacement();

create function public.validate_research_analysis_review_event()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  run_output jsonb;
  run_status text;
  expected_sha256 text;
  referenced_event_type text;
  referenced_output_sha256 text;
begin
  select analysis.output_json, analysis.status
    into run_output, run_status
  from public.research_analysis_runs analysis
  where analysis.id = new.analysis_run_id
    and analysis.user_id = new.user_id
    and analysis.workspace_id = new.workspace_id;

  if run_output is null or run_status not in ('completed', 'partial') then
    raise exception 'review requires a terminal analysis result';
  end if;

  expected_sha256 := pg_catalog.encode(
    extensions.digest(run_output::text, 'sha256'),
    'hex'
  );
  if new.output_sha256 <> expected_sha256 then
    raise exception 'review output digest does not match the analysis result';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(run_output -> 'sections') section
    where section ->> 'key' = new.section_key
  ) then
    raise exception 'review section is not present in the analysis result';
  end if;

  if new.content_event_id is not null then
    select event.event_type, event.output_sha256
      into referenced_event_type, referenced_output_sha256
    from public.research_analysis_review_events event
    where event.id = new.content_event_id
      and event.user_id = new.user_id
      and event.workspace_id = new.workspace_id
      and event.analysis_run_id = new.analysis_run_id
      and event.section_key = new.section_key;

    if referenced_event_type <> 'edit_saved'
      or referenced_output_sha256 <> new.output_sha256 then
      raise exception 'review content reference is not a matching edit';
    end if;
  end if;

  if new.event_type = 'citation_flagged' and not exists (
    select 1
    from jsonb_array_elements(run_output -> 'citations') citation
    where citation ->> 'chunkId' = new.citation_chunk_id::text
  ) then
    raise exception 'citation feedback target is not present in the analysis result';
  end if;

  return new;
end;
$$;

create trigger research_analysis_review_events_validate
  before insert on public.research_analysis_review_events
  for each row execute function public.validate_research_analysis_review_event();

create function public.prevent_research_analysis_review_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'research analysis review events are append-only';
end;
$$;

create trigger research_analysis_review_events_append_only
  before update or delete on public.research_analysis_review_events
  for each row execute function public.prevent_research_analysis_review_event_mutation();

alter table public.research_analysis_review_events enable row level security;
alter table public.research_analysis_review_events force row level security;

create policy research_analysis_review_events_own_rows
  on public.research_analysis_review_events
  for all
  to aperture_api
  using (
    user_id = public.current_profile_id()
    and exists (
      select 1
      from public.research_workspaces workspace
      where workspace.id = research_analysis_review_events.workspace_id
        and workspace.user_id = public.current_profile_id()
    )
    and exists (
      select 1
      from public.research_analysis_runs analysis
      where analysis.id = research_analysis_review_events.analysis_run_id
        and analysis.user_id = public.current_profile_id()
        and analysis.workspace_id = research_analysis_review_events.workspace_id
    )
  )
  with check (
    user_id = public.current_profile_id()
    and exists (
      select 1
      from public.research_workspaces workspace
      where workspace.id = research_analysis_review_events.workspace_id
        and workspace.user_id = public.current_profile_id()
    )
    and exists (
      select 1
      from public.research_analysis_runs analysis
      where analysis.id = research_analysis_review_events.analysis_run_id
        and analysis.user_id = public.current_profile_id()
        and analysis.workspace_id = research_analysis_review_events.workspace_id
    )
  );

revoke all on public.research_analysis_review_events from anon, authenticated;
grant select, insert on public.research_analysis_review_events to aperture_api;
grant select, insert on public.research_analysis_review_events to service_role;

grant usage on schema extensions to aperture_api;
grant execute on function extensions.digest(text, text) to aperture_api;

revoke all on function public.prevent_research_analysis_output_replacement() from public;
revoke all on function public.validate_research_analysis_review_event() from public;
revoke all on function public.prevent_research_analysis_review_event_mutation() from public;
