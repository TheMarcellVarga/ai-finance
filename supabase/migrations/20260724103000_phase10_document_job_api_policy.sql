-- Permit only the server-side API role to inspect and enqueue jobs for workspaces
-- owned by the profile selected for the current transaction. The worker continues
-- to use the privileged database connection for leasing and completing jobs.

create policy document_processing_jobs_api_own_rows
  on public.document_processing_jobs
  for all
  to aperture_api
  using (
    exists (
      select 1
      from public.research_workspaces workspace
      where workspace.id = document_processing_jobs.workspace_id
        and workspace.user_id = public.current_profile_id()
    )
  )
  with check (
    exists (
      select 1
      from public.research_workspaces workspace
      where workspace.id = document_processing_jobs.workspace_id
        and workspace.user_id = public.current_profile_id()
    )
  );
