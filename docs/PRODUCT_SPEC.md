# Product Spec

## Working Name

Aperture Financial Intelligence.

The name points to a research lens: the product helps users inspect financial context, portfolio exposures, filings, and scenarios. It does not imply trade execution, prediction, or advice.

## Name Shortlist

| Name | Rationale | Status |
| --- | --- | --- |
| Aperture Financial Intelligence | Research lens, broad enough for portfolio, filings, risk, and goals | Working name |
| LedgerLens | Clear finance/research metaphor, more compact but less premium | Backup |
| SignalRoom | Strong research-room feel, but may imply market signals too strongly | Backup with caution |
| Atlas Portfolio Intelligence | Premium and broad, but less AI-specific | Backup |

Avoid names that imply brokerage, automated advice, guaranteed outcomes, or trading execution.

## One-Sentence Product

Aperture Financial Intelligence is an AI financial research workspace that helps users understand portfolios, assets, risks, goals, and filings through cited decision-support workflows.

## Target Users

- Individual investors who want structured research and portfolio awareness.
- Finance creators and analysts who need saved, cited research briefs.
- Wealthtech and fintech hiring reviewers evaluating product engineering, AI safety, backend boundaries, and polished UI execution.
- Future team/advisor workflows, without becoming a regulated advice or brokerage system.

## Product Boundaries

Allowed:
- Portfolio research and risk explanation.
- Asset and ETF research.
- SEC filing summaries with citations.
- Watchlist digest and movement context.
- Goal scenario planning and educational milestones.
- Research discipline, diversification review, and learning achievements.

Forbidden:
- Trade execution or brokerage integrations.
- Automated trading, copy-trading, or buy/sell-now workflows.
- Personalized suitability claims.
- Guaranteed returns, alpha promises, or return predictions.
- Gamification that rewards risky trades or profit streaks.

## MVP Golden Path

1. Visitor lands on a premium fintech marketing page and understands the product is research and decision support.
2. User signs in through Clerk.
3. User creates or loads a seeded demo portfolio.
4. User reviews allocation, concentration, watchlist, risk, and data freshness.
5. User asks for a portfolio brief.
6. The app streams a real AI response using application-owned data tools.
7. The AI brief is schema-valid, persisted, cited where possible, and includes assumptions, freshness, confidence, and a not-financial-advice disclaimer.
8. User saves the brief to the research room and can inspect citations.

## Pricing Direction

Exact Stripe prices can be adjusted before implementation, but entitlement limits must be concrete.

| Tier | Audience | Draft Limits |
| --- | --- | --- |
| Free | Portfolio demo and light research | 1 portfolio, 10 holdings, 1 watchlist, 5 AI briefs/month, 5 saved research items |
| Pro | Individual power user | 5 portfolios, 100 holdings, 5 watchlists, 100 AI briefs/month, 100 saved research items |
| Research Pro | Analyst-heavy user | 20 portfolios, 500 holdings, 20 watchlists, 500 AI briefs/month, 1,000 saved research items, filing summaries |
| Team/Advisor | Future collaborative plan | Organization seats, shared research rooms, audit export, higher quotas |

## Demo Asset Universe

Use curated US equities and ETFs for v1:
- Mega-cap technology: AAPL, MSFT, NVDA, GOOGL, AMZN, META
- Financials: JPM, BRK.B, V
- Healthcare: UNH, JNJ, LLY
- Energy/industrials: XOM, CAT
- ETFs: SPY, QQQ, VTI, IWM, AGG, GLD, VNQ

Demo data should be deterministic and clearly labeled when cached or stale.

## Brand Direction

Keywords:
- precise
- cinematic
- analytical
- trustworthy
- premium terminal
- dark metal
- glass depth
- citation-first

Visual direction:
- Dark-first interface with graphite, black, cool gray, restrained cyan/green accents, and sparing warm risk colors.
- Dense dashboard previews with real-looking but seed-backed finance data.
- Original logo mark and wordmark, not AI-raster text.
- Licensed stock media around analyst workstations, data infrastructure, market maps, finance districts, and premium device/dashboard contexts.

## Logo Direction

Concept:
- Abstract aperture ring or lens mark built from segmented radial bars.
- Subtle embedded chart or axis cue without candlestick cliches.
- Wordmark uses clean geometric sans typography.
- Mark must work at favicon size, app icon size, and in monochrome.

Do not use AI-generated raster text as the final logo. Use generated images only for concept exploration, then recreate the final wordmark and mark as production-safe vector or CSS/SVG assets.

## Stock Media Candidate List

Verify license again at download time and store source notes with any committed asset.

| Candidate | Source | Use | License Note |
| --- | --- | --- | --- |
| [Financial stock market data displayed on a screen](https://unsplash.com/photos/financial-stock-market-data-displayed-on-a-screen-EuIqk6LpUU0) | Unsplash, Daniel Brzdek | Product/dashboard texture or research page | Page lists free use under the Unsplash License |
| [Stock market data displayed on a computer screen](https://unsplash.com/photos/stock-market-data-displayed-on-a-computer-screen-itgsDhR1e2w) | Unsplash, Jakub Zerdzicki | Product detail section or app preview background | Page lists free use under the Unsplash License |
| [Someone analyzes financial data on a tablet](https://unsplash.com/photos/someone-analyzes-financial-data-on-a-tablet-EL16ACtwLxg) | Unsplash, Jakub Zerdzicki | Human-in-workflow product section | Page lists free use under the Unsplash License |
| [Analyzing Stock Market Data on Digital Tablet](https://www.pexels.com/video/analyzing-stock-market-data-on-digital-tablet-32388701/) | Pexels, Jakub Zerdzicki | Short muted marketing loop | Pexels states uploaded photos/videos use the Pexels license for free personal/commercial use without attribution |
| [A Person Monitoring the Stock Market](https://www.pexels.com/video/a-person-monitoring-the-stock-market-7681473/) | Pexels, Mikhail Nilov | Secondary product video or poster frame | Pexels license; avoid copy implying active trade execution |
| [Analyzing Stock Market Trends on Interactive Screen](https://www.pexels.com/video/analyzing-stock-market-trends-on-interactive-screen-30289540/) | Pexels, Sourav Sharma | Experimental background motion only if cropped away from trading prompts | Pexels license; tags include trading language, so use only in research framing |

Media constraints:
- Prefer product UI screenshots over stock media once the app exists.
- Use compressed assets, poster images, and reduced-motion fallbacks.
- Avoid visible brokerage brands, trading-platform endorsements, or claims that imply investment advice.

## Compliance-Safe Copy Rules

Use:
- "research"
- "decision support"
- "risk explanation"
- "scenario planning"
- "portfolio intelligence"
- "review"
- "monitor"
- "compare"

Avoid:
- "buy"
- "sell"
- "hold recommendation"
- "guaranteed"
- "beat the market"
- "suitable for you"
- "automated trading"
- "AI advisor"

## Phase 1 Acceptance Checklist

- Product can be explained without saying trading bot.
- Golden path is exact enough to implement.
- Pricing limits are concrete enough for entitlement modeling.
- Demo tickers are listed.
- Brand, logo, and media direction are specific enough for Phase 2 scaffold and later asset work.
