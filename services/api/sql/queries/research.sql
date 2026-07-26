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

-- name: DeleteResearchDocumentChunks :exec
delete from public.research_chunks
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

-- name: InsertResearchDocumentChunk :exec
insert into public.research_chunks (
  id,
  document_id,
  workspace_id,
  page_number,
  sequence,
  chunk_text,
  source_locator,
  section_label,
  heading_path,
  character_start,
  character_end,
  stable_key,
  content_sha256,
  chunker_version,
  embedding,
  embedding_status,
  embedding_provider,
  embedding_model,
  embedding_version,
  embedding_dimensions,
  embedded_at
)
values (
  sqlc.arg(id),
  sqlc.arg(document_id),
  sqlc.arg(workspace_id),
  sqlc.arg(page_number),
  sqlc.arg(sequence),
  sqlc.arg(chunk_text),
  sqlc.arg(source_locator),
  sqlc.arg(section_label),
  sqlc.arg(heading_path),
  sqlc.arg(character_start),
  sqlc.arg(character_end),
  sqlc.arg(stable_key),
  sqlc.arg(content_sha256),
  sqlc.arg(chunker_version),
  sqlc.arg(embedding),
  'ready',
  sqlc.arg(embedding_provider),
  sqlc.arg(embedding_model),
  sqlc.arg(embedding_version),
  sqlc.arg(embedding_dimensions),
  now()
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

-- name: CountOwnedResearchDocumentFilters :one
select count(*)
from public.research_documents document
join public.research_workspaces workspace on workspace.id = document.workspace_id
where document.workspace_id = sqlc.arg(workspace_id)
  and workspace.user_id = sqlc.arg(user_id)
  and document.status <> 'deleted'
  and document.id = any(sqlc.arg(document_ids)::uuid[]);

-- name: SearchResearchEvidenceCandidates :many
with vector_candidates as (
  select
    chunk.id,
    row_number() over (order by chunk.embedding <=> sqlc.arg(query_embedding)::vector) as vector_rank,
    cast(greatest(
      -1.0::double precision,
      least(1.0::double precision, 1.0::double precision - (chunk.embedding <=> sqlc.arg(query_embedding)::vector))
    ) as double precision) as vector_similarity
  from public.research_chunks chunk
  join public.research_documents document on document.id = chunk.document_id
  join public.research_workspaces workspace on workspace.id = chunk.workspace_id
  where chunk.workspace_id = sqlc.arg(workspace_id)
    and workspace.user_id = sqlc.arg(user_id)
    and document.workspace_id = workspace.id
    and document.status = 'ready'
    and chunk.embedding_status = 'ready'
    and chunk.embedding_provider = sqlc.arg(embedding_provider)
    and chunk.embedding_model = sqlc.arg(embedding_model)
    and chunk.embedding_version = sqlc.arg(embedding_version)
    and chunk.embedding_dimensions = sqlc.arg(embedding_dimensions)
    and (
      cardinality(sqlc.arg(document_ids)::uuid[]) = 0
      or chunk.document_id = any(sqlc.arg(document_ids)::uuid[])
    )
  order by chunk.embedding <=> sqlc.arg(query_embedding)::vector
  limit sqlc.arg(candidate_limit)::integer
),
lexical_candidates as (
  select
    chunk.id,
    row_number() over (
      order by ts_rank_cd(chunk.search_vector, websearch_to_tsquery('english', sqlc.arg(search_query))) desc
    ) as lexical_rank,
    ts_rank_cd(chunk.search_vector, websearch_to_tsquery('english', sqlc.arg(search_query)))::double precision as lexical_score
  from public.research_chunks chunk
  join public.research_documents document on document.id = chunk.document_id
  join public.research_workspaces workspace on workspace.id = chunk.workspace_id
  where chunk.workspace_id = sqlc.arg(workspace_id)
    and workspace.user_id = sqlc.arg(user_id)
    and document.workspace_id = workspace.id
    and document.status = 'ready'
    and chunk.embedding_status = 'ready'
    and chunk.embedding_provider = sqlc.arg(embedding_provider)
    and chunk.embedding_model = sqlc.arg(embedding_model)
    and chunk.embedding_version = sqlc.arg(embedding_version)
    and chunk.embedding_dimensions = sqlc.arg(embedding_dimensions)
    and chunk.search_vector @@ websearch_to_tsquery('english', sqlc.arg(search_query))
    and (
      cardinality(sqlc.arg(document_ids)::uuid[]) = 0
      or chunk.document_id = any(sqlc.arg(document_ids)::uuid[])
    )
  order by lexical_score desc
  limit sqlc.arg(candidate_limit)::integer
),
candidate_ids as (
  select id from vector_candidates
  union
  select id from lexical_candidates
)
select
  chunk.id,
  chunk.document_id,
  document.title as document_title,
  chunk.page_number,
  chunk.sequence,
  chunk.chunk_text,
  chunk.source_locator,
  chunk.section_label,
  chunk.heading_path,
  chunk.chunker_version,
  chunk.embedding_provider,
  chunk.embedding_model,
  chunk.embedding_version,
  coalesce(vector_candidates.vector_similarity, 0.0::double precision) as vector_similarity,
  coalesce(lexical_candidates.lexical_score, 0.0::double precision) as lexical_score,
  cast((
    coalesce(1.0::double precision / (60.0::double precision + vector_candidates.vector_rank), 0.0::double precision)
    + coalesce(1.0::double precision / (60.0::double precision + lexical_candidates.lexical_rank), 0.0::double precision)
  ) as double precision) as combined_score,
  chunk.content_sha256
from candidate_ids
join public.research_chunks chunk on chunk.id = candidate_ids.id
join public.research_documents document on document.id = chunk.document_id
left join vector_candidates on vector_candidates.id = chunk.id
left join lexical_candidates on lexical_candidates.id = chunk.id
order by combined_score desc, chunk.id
limit sqlc.arg(candidate_limit)::integer;

-- name: InsertResearchRetrievalRun :exec
insert into public.research_retrieval_runs (
  id,
  user_id,
  workspace_id,
  query_sha256,
  selected_document_ids,
  requested_limit,
  candidate_count,
  returned_count,
  result_chunk_ids,
  chunker_version,
  embedding_provider,
  embedding_model,
  embedding_version,
  embedding_dimensions,
  filters,
  stage_timings
)
values (
  sqlc.arg(id),
  sqlc.arg(user_id),
  sqlc.arg(workspace_id),
  sqlc.arg(query_sha256),
  sqlc.arg(selected_document_ids),
  sqlc.arg(requested_limit),
  sqlc.arg(candidate_count),
  sqlc.arg(returned_count),
  sqlc.arg(result_chunk_ids),
  sqlc.arg(chunker_version),
  sqlc.arg(embedding_provider),
  sqlc.arg(embedding_model),
  sqlc.arg(embedding_version),
  sqlc.arg(embedding_dimensions),
  sqlc.arg(filters),
  sqlc.arg(stage_timings)
);
