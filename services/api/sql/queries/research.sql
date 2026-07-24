-- name: EnsureProfile :one
insert into public.profiles (clerk_user_id)
values (sqlc.arg(clerk_user_id))
on conflict (clerk_user_id) do update
set clerk_user_id = excluded.clerk_user_id
returning id;

-- name: CreateResearchWorkspace :one
insert into public.research_workspaces (id, user_id, name, description)
values (sqlc.arg(id), sqlc.arg(user_id), sqlc.arg(name), sqlc.arg(description))
returning id, name, description, status, created_at, updated_at;

-- name: ListResearchWorkspaces :many
select id, name, description, status, created_at, updated_at
from public.research_workspaces
where user_id = sqlc.arg(user_id)
  and status = 'active'
order by updated_at desc;

-- name: GetResearchWorkspace :one
select id, name, description, status, created_at, updated_at
from public.research_workspaces
where id = sqlc.arg(id)
  and user_id = sqlc.arg(user_id)
  and status = 'active';

-- name: CreateResearchDocument :one
insert into public.research_documents (
  id,
  workspace_id,
  uploaded_by,
  source_type,
  title,
  original_filename,
  mime_type,
  byte_size,
  sha256,
  storage_bucket,
  storage_object_key,
  status,
  embedding_status
)
values (
  sqlc.arg(id),
  sqlc.arg(workspace_id),
  sqlc.arg(uploaded_by),
  'user_upload',
  sqlc.arg(title),
  sqlc.arg(original_filename),
  sqlc.arg(mime_type),
  sqlc.arg(byte_size),
  sqlc.arg(sha256),
  sqlc.arg(storage_bucket),
  sqlc.arg(storage_object_key),
  'uploading',
  'not_started'
)
returning
  id, workspace_id, title, original_filename, mime_type, byte_size, sha256,
  storage_bucket, storage_object_key, status, attempt_count, error_code,
  error_message, page_count, uploaded_at, parsed_at, created_at, updated_at;

-- name: ListResearchDocuments :many
select
  document.id, document.workspace_id, document.title, document.original_filename,
  document.mime_type, document.byte_size, document.sha256, document.storage_bucket,
  document.storage_object_key, document.status, document.attempt_count,
  document.error_code, document.error_message, document.page_count,
  document.uploaded_at, document.parsed_at, document.created_at, document.updated_at
from public.research_documents document
join public.research_workspaces workspace on workspace.id = document.workspace_id
where document.workspace_id = sqlc.arg(workspace_id)
  and workspace.user_id = sqlc.arg(user_id)
  and document.status <> 'deleted'
order by document.created_at desc;

-- name: GetResearchDocument :one
select
  document.id, document.workspace_id, document.title, document.original_filename,
  document.mime_type, document.byte_size, document.sha256, document.storage_bucket,
  document.storage_object_key, document.status, document.attempt_count,
  document.error_code, document.error_message, document.page_count,
  document.uploaded_at, document.parsed_at, document.created_at, document.updated_at
from public.research_documents document
join public.research_workspaces workspace on workspace.id = document.workspace_id
where document.id = sqlc.arg(id)
  and document.workspace_id = sqlc.arg(workspace_id)
  and workspace.user_id = sqlc.arg(user_id)
  and document.status <> 'deleted';

-- name: FinalizeResearchDocumentUpload :one
update public.research_documents document
set
  status = 'queued',
  attempt_count = attempt_count + 1,
  uploaded_at = now(),
  error_code = null,
  error_message = null
from public.research_workspaces workspace
where document.id = sqlc.arg(id)
  and document.workspace_id = sqlc.arg(workspace_id)
  and workspace.id = document.workspace_id
  and workspace.user_id = sqlc.arg(user_id)
  and document.status in ('uploading', 'failed')
returning
  document.id, document.workspace_id, document.title, document.original_filename,
  document.mime_type, document.byte_size, document.sha256, document.storage_bucket,
  document.storage_object_key, document.status, document.attempt_count,
  document.error_code, document.error_message, document.page_count,
  document.uploaded_at, document.parsed_at, document.created_at, document.updated_at;

-- name: MarkResearchDocumentUploadFailed :execrows
update public.research_documents document
set
  status = 'failed',
  error_code = sqlc.arg(error_code),
  error_message = 'The document could not be stored. Retry the upload.'
from public.research_workspaces workspace
where document.id = sqlc.arg(id)
  and document.workspace_id = sqlc.arg(workspace_id)
  and workspace.id = document.workspace_id
  and workspace.user_id = sqlc.arg(user_id);

-- name: QueueDocumentProcessingJob :one
insert into public.document_processing_jobs (
  id,
  document_id,
  workspace_id,
  idempotency_key
)
values (
  sqlc.arg(id),
  sqlc.arg(document_id),
  sqlc.arg(workspace_id),
  sqlc.arg(idempotency_key)
)
returning id;

-- name: ActiveDocumentProcessingJobCount :one
select count(*)
from public.document_processing_jobs
where document_id = sqlc.arg(document_id)
  and status in ('queued', 'processing');

-- name: RetryResearchDocument :one
update public.research_documents document
set
  status = 'queued',
  attempt_count = attempt_count + 1,
  error_code = null,
  error_message = null
from public.research_workspaces workspace
where document.id = sqlc.arg(id)
  and document.workspace_id = sqlc.arg(workspace_id)
  and workspace.id = document.workspace_id
  and workspace.user_id = sqlc.arg(user_id)
  and document.status = 'failed'
returning
  document.id, document.workspace_id, document.title, document.original_filename,
  document.mime_type, document.byte_size, document.sha256, document.storage_bucket,
  document.storage_object_key, document.status, document.attempt_count,
  document.error_code, document.error_message, document.page_count,
  document.uploaded_at, document.parsed_at, document.created_at, document.updated_at;

-- name: ListResearchDocumentPages :many
select
  page.id, page.document_id, page.workspace_id, page.page_number,
  page.normalized_text, page.text_sha256, page.character_count, page.source_metadata
from public.document_pages page
join public.research_documents document on document.id = page.document_id
join public.research_workspaces workspace on workspace.id = page.workspace_id
where page.document_id = sqlc.arg(document_id)
  and page.workspace_id = sqlc.arg(workspace_id)
  and document.workspace_id = workspace.id
  and workspace.user_id = sqlc.arg(user_id)
order by page.page_number;

-- name: ClaimDocumentProcessingJob :one
with candidate as (
  select job.id
  from public.document_processing_jobs job
  where (
      job.status = 'queued'
      and job.available_at <= now()
    )
    or (
      job.status = 'processing'
      and job.lease_expires_at <= now()
    )
  order by job.available_at, job.created_at
  for update skip locked
  limit 1
),
claimed as (
  update public.document_processing_jobs job
  set
    status = 'processing',
    attempts = attempts + 1,
    lease_owner = sqlc.arg(lease_owner),
    lease_expires_at = now() + sqlc.arg(lease_seconds)::integer * interval '1 second',
    started_at = coalesce(started_at, now())
  from candidate
  where job.id = candidate.id
  returning job.id, job.document_id, job.attempts, job.max_attempts
)
select
  claimed.id as job_id,
  claimed.attempts,
  claimed.max_attempts,
  document.id,
  document.workspace_id,
  document.title,
  document.original_filename,
  document.mime_type,
  document.byte_size,
  document.sha256,
  document.storage_bucket,
  document.storage_object_key,
  document.status,
  document.attempt_count,
  document.error_code,
  document.error_message,
  document.page_count,
  document.uploaded_at,
  document.parsed_at,
  document.created_at,
  document.updated_at
from claimed
join public.research_documents document on document.id = claimed.document_id;

-- name: MarkResearchDocumentProcessing :exec
update public.research_documents
set status = 'processing'
where id = sqlc.arg(id);

-- name: DeleteResearchDocumentPages :exec
delete from public.document_pages
where document_id = sqlc.arg(document_id);

-- name: InsertResearchDocumentPage :exec
insert into public.document_pages (
  id,
  document_id,
  workspace_id,
  page_number,
  normalized_text,
  text_sha256,
  character_count,
  source_metadata
)
values (
  sqlc.arg(id),
  sqlc.arg(document_id),
  sqlc.arg(workspace_id),
  sqlc.arg(page_number),
  sqlc.arg(normalized_text),
  sqlc.arg(text_sha256),
  sqlc.arg(character_count),
  sqlc.arg(source_metadata)
);

-- name: CompleteDocumentProcessingJob :exec
update public.document_processing_jobs
set
  status = 'succeeded',
  completed_at = now(),
  lease_owner = null,
  lease_expires_at = null,
  stage_timings = sqlc.arg(stage_timings),
  error_code = null,
  error_message = null
where id = sqlc.arg(id)
  and status = 'processing';

-- name: CompleteResearchDocumentProcessing :one
update public.research_documents
set
  status = 'ready',
  page_count = sqlc.arg(page_count),
  parsed_at = now(),
  error_code = null,
  error_message = null
where id = sqlc.arg(id)
returning
  id, workspace_id, title, original_filename, mime_type, byte_size, sha256,
  storage_bucket, storage_object_key, status, attempt_count, error_code,
  error_message, page_count, uploaded_at, parsed_at, created_at, updated_at;

-- name: GetDocumentProcessingJob :one
select id, document_id, attempts, max_attempts
from public.document_processing_jobs
where id = sqlc.arg(id)
for update;

-- name: FailDocumentProcessingJob :exec
update public.document_processing_jobs
set
  status = sqlc.arg(status),
  available_at = sqlc.arg(available_at),
  completed_at = case when sqlc.arg(status) = 'failed' then now() else null end,
  lease_owner = null,
  lease_expires_at = null,
  error_code = sqlc.arg(error_code),
  error_message = sqlc.arg(error_message)
where id = sqlc.arg(id);

-- name: FailResearchDocumentProcessing :exec
update public.research_documents
set
  status = sqlc.arg(status),
  error_code = sqlc.arg(error_code),
  error_message = sqlc.arg(error_message)
where id = sqlc.arg(id);
