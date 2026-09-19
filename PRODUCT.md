# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is an individual investor who wants one place to understand the market and connect personal finances to a future goal. The product is also evaluated as a recruiter-grade fintech and AI engineering portfolio.

## Product Purpose

Aperture Financial Intelligence helps a user answer one question: **Am I on track, and what assumptions would change the outcome?**

The core loop is to enter income, expenses, assets, and a goal; monitor relevant markets; review a configurable future projection; compare investment scenarios; and learn the concepts needed to interpret the result.

## Positioning

Aperture connects provider-backed market context to the user's own portfolio and cash-flow assumptions. It explains scenarios and tradeoffs without becoming a brokerage, trading bot, return predictor, or personalized investment adviser.

## Operating Context

The primary workspace has five destinations:

1. **Overview** — current position and the next useful action.
2. **Markets** — one searchable mega table spanning supported asset classes, with class-specific monitors available as drill-downs.
3. **Portfolio** — user-entered assets, holdings, allocation, and source freshness.
4. **Plan** — income, expenses, goals, a configurable projection chart, and investment scenario calculations.
5. **Learn** — the retained education system, surfaced contextually from market and planning concepts.

Research, risk explanations, watchlists, journals, playbooks, evaluations, billing, and settings are supporting capabilities. They should appear inside the relevant workflow or under account controls rather than compete as primary navigation.

## Capabilities and Constraints

- Market coverage is provider-backed and filterable by supported asset class and available metadata. The `/crypto-monitor` interaction and VargaTrend data contract are the canonical monitor standard for the combined Markets view and every supported asset-class monitor.
- Users enter their own income, recurring expenses, assets, contributions, goal amount, and time horizon.
- Projections are scenarios, not forecasts. They must show assumptions, ranges where appropriate, data freshness, and a not-financial-advice notice.
- The investment calculator compares user-controlled contribution and return assumptions. It must never recommend a security, promise a result, or label an option suitable for the user.
- Education remains a first-class capability, but learning content should be connected to the task at hand instead of expanding the main navigation.
- Existing research and evidence tooling remains available as a supporting capability; it is not the default product story.
- No brokerage integrations, wallet signing, trade execution, copy trading, automated trading, or buy/sell-now workflows.
- Real AI integration remains required where AI is used. External paid model calls remain disabled until explicitly approved.

## Brand Commitments

The working name is Aperture Financial Intelligence. The voice is precise, calm, analytical, and explicit about uncertainty. Existing production-safe brand assets and the dark premium-fintech identity remain in place.

## Evidence on Hand

- Provider-backed global asset taxonomy, search, portfolio, watchlist, and market-monitor flows.
- Owner-scoped portfolio APIs and finance data boundaries.
- Goal scenario logic with visible assumptions.
- A complete local-first education curriculum, labs, and saved learning artifacts.
- Citation, safety, persistence, evaluation, and review infrastructure for AI research workflows.

No validated user evidence currently proves that separate top-level research, risk, journal, playbook, evaluation, and billing destinations improve the core experience. They are therefore treated as supporting capabilities.

## Product Principles

1. One financial picture before many tools.
2. Show assumptions before outcomes.
3. Contextual depth beats permanent navigation.
4. Education should explain the decision in front of the user.
5. Market awareness and personal planning remain decision support, never advice or execution.

## Accessibility & Inclusion

Core workflows must remain keyboard accessible, responsive from mobile through wide desktop, readable without relying on color alone, and usable with reduced motion.
