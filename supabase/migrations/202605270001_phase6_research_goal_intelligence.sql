insert into public.challenges (slug, title, description, reward_type)
values
  (
    'save-cited-research-note',
    'Save a cited research note',
    'Save a research-room note with at least one source reference before a portfolio review.',
    'education'
  ),
  (
    'review-diversification',
    'Review diversification',
    'Document concentration and sector exposure as part of a research discipline workflow.',
    'education'
  ),
  (
    'freshness-check',
    'Check data freshness',
    'Confirm provider timestamps before interpreting portfolio, filing, or goal-planning output.',
    'education'
  )
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  reward_type = excluded.reward_type;

insert into public.achievements (slug, title, description)
values
  (
    'cited-research-discipline',
    'Cited research discipline',
    'Awarded when a user saves a research artifact with source references and freshness metadata.'
  ),
  (
    'risk-review-complete',
    'Risk review complete',
    'Awarded when a user completes a concentration or allocation review without trade-instruction framing.'
  )
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description;

with asset_row as (
  insert into public.assets (ticker, name, exchange, asset_type, sector, industry, cik, metadata)
  values (
    'AAPL',
    'Apple Inc.',
    'NASDAQ',
    'equity',
    'Technology',
    'Consumer Electronics',
    '0000320193',
    '{"phase6Seed": true}'::jsonb
  )
  on conflict (ticker) do update
  set
    name = excluded.name,
    exchange = excluded.exchange,
    asset_type = excluded.asset_type,
    sector = excluded.sector,
    industry = excluded.industry,
    cik = excluded.cik,
    metadata = public.assets.metadata || excluded.metadata
  returning id
),
document_row as (
  insert into public.research_documents (
    asset_id,
    source_type,
    title,
    source_url,
    filing_accession,
    fetched_text,
    embedding_status,
    fetched_at
  )
  select
    id,
    'sec_filing',
    'Apple Inc. annual filing research fixture',
    'https://www.sec.gov/Archives/edgar/data/320193/',
    'phase6-fixture-aapl-10k',
    'Phase 6 deterministic filing fixture for local retrieval, citation, freshness, and prompt-injection tests.',
    'fixture',
    '2026-05-24T00:00:00Z'::timestamptz
  from asset_row
  on conflict do nothing
  returning id
)
insert into public.research_chunks (
  document_id,
  chunk_text,
  source_locator,
  section_label,
  token_count,
  embedding_status
)
select
  id,
  chunk_text,
  source_locator,
  section_label,
  token_count,
  'fixture'
from document_row
cross join (
  values
    (
      'Competitive pressure, product-cycle dependency, and supply-chain exposure are research topics that require review against the source filing.',
      'AAPL FY2025 10-K Item 1A',
      'Item 1A. Risk Factors',
      22
    ),
    (
      'Hardware, services, and platform ecosystem revenue drivers should be summarized with citations and without trade timing or suitability claims.',
      'AAPL FY2025 10-K Item 1',
      'Item 1. Business',
      21
    )
) as chunks(chunk_text, source_locator, section_label, token_count);
