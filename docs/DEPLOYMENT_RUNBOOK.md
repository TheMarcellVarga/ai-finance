# Deployment Runbook

This runbook packages the Evidence Workspace without enabling external AI spend. It assumes Vercel for Next.js, a Kubernetes-compatible container platform for the Go API and document worker, and a hosted Supabase project for Postgres, pgvector, and private document storage.

## Release topology

- Vercel serves `apps/web`; browser traffic reaches application data through its server-side BFF routes.
- The `api` target in `services/api/Dockerfile` runs the owner-scoped finance and research API.
- The `worker` target runs document parsing, chunking, embedding, and indexing as a separate long-running process.
- The worker mounts a bounded ephemeral `/tmp` volume for PDF parsing while keeping the image filesystem read-only.
- Supabase is the relational system of record and private object store. The service-role key is available only to server workloads.
- `deploy/kubernetes/*.yaml` are reviewed templates. Replace `OWNER` and `RELEASE_SHA`; do not commit a rendered Secret.

## Preflight gate

1. Run `supabase db reset`, `supabase db lint`, and `scripts/validate-migrations` against a disposable environment.
2. Run Go tests and vet, web lint/build, `npm run test:phase6`, `scripts/verify-accessibility-contracts`, `scripts/verify-deployment-artifacts`, and `scripts/verify-evidence-workspace-e2e`.
3. Confirm the evaluation dashboard reports the reviewed baseline and no release-gate regression.
4. Confirm `AI_EXTERNAL_CALLS_ENABLED=false`. Enabling model spend is a separate, explicit approval and release decision.

## Build immutable images

From `services/api`, use the same commit SHA for both targets:

```sh
docker build --target api -t ghcr.io/OWNER/ai-finance-api:RELEASE_SHA .
docker build --target worker -t ghcr.io/OWNER/ai-finance-worker:RELEASE_SHA .
```

Push only after vulnerability scanning and the preflight gate pass. Deploy images by digest where the platform supports it.

## Production configuration

Create the non-secret ConfigMap from `runtime-config.example.yaml`. Create `aperture-secrets` through the platform secret manager with `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, Clerk issuer/JWKS values, and approved provider keys. Never render those values into source-controlled YAML.

The API must use `API_AUTH_MODE=clerk`; dev bearer tokens are rejected in production. The worker and API must use `RESEARCH_PERSISTENCE_MODE=postgres` and `DOCUMENT_STORAGE_MODE=supabase`. Production rejects local research embeddings unless the deliberate unsafe-for-release override is enabled.

Configure Vercel with the Clerk values, `FINANCE_API_BASE_URL` for the internal API origin, `FINANCE_API_AUTH_MODE=clerk`, and the relevant server-only Supabase/AI values. Keep `AI_RESEARCH_GENERATION_MODE` and `AI_PORTFOLIO_BRIEF_MODE` out of live mode while external calls are disabled.

## Deployment order

1. Back up the database and apply Supabase migrations before application rollout. Migrations in this repository are forward-only; inspect each one before production use.
2. Deploy the worker at one replica. Its claim/lease behavior permits recovery, while `Recreate` avoids unnecessary duplicate polling during a routine rollout.
3. Deploy two API replicas, wait for `/v1/health` readiness, then smoke-test an authenticated owner-scoped request.
4. Deploy the Vercel build and verify upload, processing, retrieval, analysis, human review, citation inspection, and reviewed export.
5. Observe structured logs, processing backlog, failure states, response latency, and AI usage metadata before declaring the release healthy.

## Failure modes and recovery

- **API health fails:** keep traffic on the previous ReplicaSet, inspect startup validation and secret references, then roll back the image.
- **Worker backlog grows:** do not re-upload documents. Inspect failed processing jobs and parser/provider errors; retry only through the owner-scoped retry path after correction.
- **Provider unavailable:** preserve the last known data with its freshness marker or return an explicit unavailable state. Never fabricate quotes, evidence, or citations.
- **Model output invalid:** one schema repair is permitted; otherwise the run becomes explicit partial/failed output. Consequential exports still require human acceptance.
- **Prompt injection detected:** exclude the hostile chunk; fail closed when no safe retrieved evidence remains. Keep the security event in audit/usage metadata.
- **Cross-workspace access suspected:** remove public traffic, preserve audit evidence, rotate exposed credentials, and investigate ownership predicates before restoring service.
- **Migration failure:** stop rollout. Restore from the pre-deploy backup if the migration cannot safely complete; never run an ad-hoc destructive rollback against production.

## Rollback

Redeploy the previous immutable API and worker image digests, then promote the previous Vercel deployment. Database rollback is not coupled to application rollback: use the backup and a reviewed recovery plan only when a forward-compatible application rollback is impossible. Confirm health, ownership isolation, and a reviewed export after recovery.
