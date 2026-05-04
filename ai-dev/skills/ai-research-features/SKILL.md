---
name: ai-research-features
description: Build and review real AI research features. Use when working on Vercel AI SDK integration, AI Gateway, tool calling, structured outputs, RAG, citations, embeddings, AI evals, prompt safety, portfolio copilot, filing summaries, or goal planner AI.
---

# AI Research Features

## Overview
Use this skill for real AI implementation work. The product must use actual model calls, structured outputs, tool-calling, citations, persisted runs, and evals.

## Required Architecture
- Use Vercel AI SDK through Vercel AI Gateway for text, chat, streaming, and tool calls.
- Use direct provider SDKs only when needed, especially embeddings.
- Tools must call application-owned APIs or safe server wrappers.
- Do not expose raw database credentials or unrestricted data to the model.
- Persist threads, messages, tool runs, citations, retrieved context metadata, usage, model, latency, and cost.

## Required AI Features
- Portfolio copilot.
- Asset research brief.
- SEC filing summarizer.
- Watchlist digest.
- Goal planner.
- Risk explainer.
- Research-room assistant.

## Required Evals
- Schema validity.
- Citation presence.
- Advice boundary.
- Prompt-injection resistance.
- Ownership isolation.
- Stale-data disclosure.
- Goal-planner safety.

## References
Read `references/ai-runtime.md` before changing prompts, tools, schemas, RAG, citations, or eval fixtures.
