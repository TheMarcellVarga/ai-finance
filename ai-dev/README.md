# AI Development Setup

This directory contains planning-time AI development assets for the project. It does not implement the app. It prepares future AI agents to build the product consistently.

## Contents
- `skills/`: repo-local project skills for future Codex/agent work.
- `../AGENTS.md`: top-level instructions every future agent should follow.
- `../docs/AI_INTEGRATION_AND_DEV_SETUP.md`: source of truth for AI runtime behavior, evals, and skill strategy.
- `../scripts/`: placeholder command entrypoints for future deterministic workflows.

## Skill Usage
The skills in `ai-dev/skills` are source-controlled scaffolds. When implementation starts, install or copy the relevant skills into the active agent skill directory used by the environment.

Use the skills by task:
- Product copy, goals, pricing, gamification: `finance-product-guardrails`
- Go API, OpenAPI, finance backend: `go-finance-api`
- Next.js dashboard and AI UI: `nextjs-fintech-ui`
- Supabase migrations, RLS, vectors: `supabase-finance-schema`
- AI prompts, tool calling, RAG, evals: `ai-research-features`
- Auth, privacy, billing, AI safety review: `security-review-fintech`

## Setup Status
This is intentionally planning-only. Scripts are placeholders that define the future workflow and should be wired to real commands after the app scaffold exists.
