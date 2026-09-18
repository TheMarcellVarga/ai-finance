# AI Finance Education System — Codex Implementation Plan

## Mission

Build an original, interactive trading-education system inside the existing
`ai-finance` application.

The education system should connect directly with the existing Supertrend
Market Map / Market Monitor and teach the user how to:

- Understand market and indicator data.
- Turn observations into explicit mechanical rules.
- Manage positions and portfolio risk.
- Backtest strategies without misleading themselves.
- Compare active strategies against passive benchmarks.
- Document decisions and identify behavioural mistakes.
- Progress safely from learning to simulation and evidence-based practice review without directing live trades.

This is an educational and analytical product. It must not promise returns,
provide personalised buy/sell instructions, or execute trades.

Do not copy any paid course's proprietary content, terminology, lesson text,
screenshots, branding, or trading rules. Develop original material from
established market, statistical, and risk-management principles.

---

## Operating Instructions

1. Read all repository instructions, especially `AGENTS.md`.
2. Inspect the repository before proposing exact implementation details.
3. Identify the existing:
   - Framework and routing conventions
   - Component and styling system
   - Market-monitor and Supertrend domain models
   - Market-data services
   - Authentication and persistence approach
   - Testing framework
   - Lint, type-check and build commands
4. Preserve existing behaviour and unrelated user changes.
5. Reuse existing components and visual patterns wherever appropriate.
6. Avoid unnecessary dependencies and architectural rewrites.
7. Keep financial calculations in pure, independently testable functions.
8. Implement the work incrementally and verify every stage.
9. Do not add brokerage connectivity, trade execution or wallet signing.
10. Do not display fabricated live data or AI-generated market claims.

Before implementation, produce a concise architecture map showing the exact
files and conventions that will be used. Then proceed unless genuinely blocked.

---

## Product Principles

### Teach reasoning, not signals

The application should explain how a signal was produced and how it could be
evaluated. It must not tell the user what to buy.

### Reward process, not profit

Progress should be based on learning, evidence quality, completing reviews and
following declared rules—not portfolio returns or number of trades.

### Make uncertainty visible

Clearly distinguish:

- Historical fact
- Current market data
- Strategy assumption
- Statistical estimate
- Personal rule
- Unknown or unavailable information

### Connect learning with the product

Education should not feel like an unrelated video library. Lessons and
interactive labs should use the same concepts, components and data visible in
the market monitor.

### Protect against backtest theatre

Every strategy result should expose costs, sample size, benchmark performance,
drawdown and important methodological limitations.

---

## Proposed Information Architecture

Adapt route names to the repository's existing conventions.

- `/learn`
  - Course dashboard
  - Progress
  - Recommended next lesson
  - Recently created learning artifacts
- `/learn/[moduleSlug]`
  - Module overview
  - Lessons and mastery state
- `/learn/[moduleSlug]/[lessonSlug]`
  - Interactive lesson
- `/learn/labs`
  - Financial and strategy laboratories
- `/playbook`
  - Personal mechanical strategy specifications
- `/journal`
  - Market observations and decision journal
- `/review`
  - Rule adherence and strategy evidence review

Suggested primary navigation:

`Market Map · Monitor · Learn · Playbook · Journal`

---

## Curriculum

Every lesson must contain:

1. One explicit learning objective.
2. A concise explanation designed for 5–10 minutes of reading.
3. One worked example.
4. One interactive exercise.
5. A short objective quiz.
6. One practical artifact or saved decision.
7. Sources and a `lastReviewedAt` field.
8. A summary of common mistakes.
9. A clear next action.

### Module 0 — Protect the Account

Topics:

- Trading versus investing
- Return and risk
- Volatility versus permanent loss
- Market, exchange, liquidity and custody risk
- Why no strategy can guarantee returns
- Separating long-term assets from risk capital
- Opportunity cost and passive benchmarks
- Defining conditions under which no trade is appropriate

User artifact:

`Personal Risk Declaration`

The declaration should capture:

- Purpose of trading
- Maximum allocated trading capital
- Prohibited instruments or behaviours
- Maximum tolerable drawdown
- Conditions requiring a pause
- Passive benchmark
- Review frequency

### Module 1 — Understand the Market Map

Topics:

- OHLCV data
- Candles and returns
- Timeframes
- Trend versus momentum
- Volatility and ATR
- How Supertrend is calculated
- Why Supertrend is lagging
- False flips in sideways markets
- Market breadth
- Interpreting flip level, distance and time since flip
- Missing, delayed and stale data

Interactive outcome:

The user selects a market-monitor row and explains:

- What the displayed state objectively says
- What it does not say
- Which assumptions would be required to trade it
- What evidence would invalidate the interpretation

User artifact:

`Annotated Market Observation`

### Module 2 — Turn an Indicator Into a Strategy

Topics:

- Indicator versus strategy
- Falsifiable hypotheses
- Exact entry conditions
- Exact exit conditions
- Invalidation
- No-trade conditions
- Timeframe consistency
- Asset-universe rules
- Re-entry and cooldown rules
- Rule versioning
- Why rules must not change during an open position

User artifact:

`Strategy Specification v1`

A specification must contain:

- Strategy name and version
- Hypothesis
- Asset universe
- Required data
- Entry rules
- Exit rules
- Invalidation rules
- Position-sizing rule
- Maximum simultaneous exposure
- No-trade conditions
- Benchmark
- Evaluation metrics
- Known limitations

### Module 3 — Position Sizing and Survival

Topics:

- Account risk versus position value
- Stop distance
- Position-size calculation
- Portfolio heat
- Correlated positions
- Volatility-adjusted sizing
- Drawdown mathematics
- Risk of ruin
- Leverage and liquidation
- Gap and execution risk
- Why recovery becomes nonlinear after losses

User artifact:

`Portfolio Risk Policy`

### Module 4 — Honest Backtesting

Topics:

- In-sample and out-of-sample testing
- Look-ahead bias
- Survivorship bias
- Delisted assets
- Data quality
- Fees and spreads
- Slippage
- Execution delay
- Parameter overfitting
- Multiple-testing bias
- Walk-forward evaluation
- Minimum sample requirements
- Reproducibility

User artifact:

`Backtest Audit Checklist`

### Module 5 — Evaluate the Evidence

Topics:

- Win rate
- Average win and average loss
- Expected value
- Break-even win rate
- Profit factor
- Maximum drawdown
- Exposure time
- Volatility
- Risk-adjusted return
- Benchmark-relative performance
- Market beta versus strategy alpha
- Why headline return is insufficient
- Statistical and practical significance

User artifact:

`Strategy Scorecard`

### Module 6 — Execution

Topics:

- Market orders
- Limit orders
- Stop and stop-limit orders
- Partial fills
- Spread and price impact
- Liquidity
- Alert reliability
- Stale data
- Exchange downtime
- Counterparty risk
- Pre-trade checklist
- Post-trade review

User artifact:

`Execution Checklist`

### Module 7 — Behaviour and Psychology

Topics:

- FOMO
- Loss aversion
- Confirmation bias
- Outcome bias
- Overconfidence
- Hesitation after valid signals
- Revenge trading
- Sunk-cost behaviour
- Rule modification under stress
- Separating a good decision from a profitable outcome
- Creating trigger-response plans

User artifact:

`Behavioural Trigger Plan`

### Module 8 — Graduation

Topics:

- Historical testing
- Paper trading
- Forward testing
- Live-practice boundary
- Evidence requirements
- Pause conditions
- Strategy retirement
- Monthly review
- Rule-change governance

User artifact:

`Research Practice Constitution`

The constitution should preserve immutable versions and require explicit
acknowledgement when changed. In local-first v1, records must be scoped to the
authenticated account in the browser and clearly disclosed as local-only; do
not silently assign an unowned legacy browser record to a signed-in user.

---

## Interactive Labs

### 1. Position Size Lab

Inputs:

- Account capital
- Entry price
- Invalidation or stop price
- Permitted account risk
- Estimated fees and slippage

Outputs:

- Risk per unit
- Maximum position size
- Monetary risk
- Portfolio exposure
- Estimated all-in loss if invalidated

### 2. Expectancy Lab

Inputs:

- Win probability
- Average winning return
- Average losing return
- Trading costs
- Number of observations

Outputs:

- Gross expectancy
- Net expectancy
- Break-even win rate
- Expected value over a selected sample
- Warning when sample size is inadequate

### 3. Drawdown Recovery Lab

Visualise the nonlinear recovery required after losses.

Examples:

- 10% loss requires 11.1% recovery
- 25% loss requires 33.3% recovery
- 50% loss requires 100% recovery
- 75% loss requires 300% recovery

### 4. Supertrend Anatomy Lab

Allow the user to step through:

- True range
- ATR
- Basic bands
- Final bands
- Trend state
- Flip event

The lab should explain exactly why a selected historical flip occurred.

### 5. Backtest Integrity Lab

Allow toggling:

- Fees
- Spread
- Slippage
- Execution delay
- Delisted assets
- Start/end dates
- Parameter values

Make fragile results visibly deteriorate when realistic assumptions are enabled.

### 6. Benchmark Lab

Compare a strategy with:

- BTC buy-and-hold
- Cash
- Periodic BTC purchases
- A configurable passive benchmark

Use identical dates, cash flows and costs.

---

## Market Monitor Integration

Add contextual education without cluttering the primary market-monitor workflow.

Potential interactions:

- “Why this signal?” action on each market row
- Glossary tooltip for every non-obvious metric
- Link `last flip` to the relevant Supertrend lesson
- Link `distance` to the volatility and invalidation lessons
- Send a selected market into a lab
- Save a monitor snapshot as a journal observation
- Display data timestamp and stale-data status
- Explain objective facts separately from user-authored strategy rules

Do not generate language such as:

- “You should buy”
- “Strong opportunity”
- “Guaranteed bullish move”
- “Easy 5×”
- “Low-risk profit”

Acceptable language includes:

- “The weekly Supertrend state changed from bearish to bullish.”
- “This indicator is lagging and may reverse.”
- “No strategy rule has been applied.”
- “Historical performance does not establish future performance.”

---

## Content Model

Create architecture-appropriate equivalents of:

```ts
type LearningModule = {
  id: string;
  slug: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
};

type Lesson = {
  id: string;
  slug: string;
  title: string;
  objective: string;
  estimatedMinutes: number;
  contentVersion: number;
  lastReviewedAt: string;
  sources: SourceReference[];
  sections: LessonSection[];
  quiz: QuizQuestion[];
  exercise?: ExerciseDefinition;
};

type LessonProgress = {
  lessonId: string;
  contentVersion: number;
  status: "not_started" | "in_progress" | "completed";
  quizScore?: number;
  attempts: number;
  completedAt?: string;
};

type StrategySpecification = {
  id: string;
  name: string;
  version: number;
  hypothesis: string;
  assetUniverse: string[];
  timeframe: string;
  entryRules: Rule[];
  exitRules: Rule[];
  invalidationRules: Rule[];
  noTradeRules: Rule[];
  benchmark: string;
  createdAt: string;
  updatedAt: string;
};

type JournalEntry = {
  id: string;
  market: string;
  observedAt: string;
  objectiveObservations: string[];
  assumptions: string[];
  decision: "observe" | "simulate" | "enter" | "exit" | "no_trade";
  strategyVersion?: number;
  ruleViolations: string[];
  review?: JournalReview;
};
