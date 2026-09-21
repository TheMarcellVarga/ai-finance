export type LessonStatus = "not_started" | "in_progress" | "completed";

export type SourceReference = {
  label: string;
  href: string;
  scope?: string;
};

export type LessonSection = {
  heading: string;
  body: string;
  evidenceType: "fact" | "assumption" | "rule" | "unknown";
  sourceLabels?: string[];
};

export type LessonExercise = {
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
};

export type Lesson = {
  id: string;
  slug: string;
  title: string;
  objective: string;
  estimatedMinutes: number;
  contentVersion: number;
  lastReviewedAt: string;
  sources: SourceReference[];
  sections: LessonSection[];
  workedExample: string;
  commonMistakes: string[];
  nextAction: string;
  quiz: QuizQuestion[];
  exercise: LessonExercise;
};

export type LearningModule = {
  id: string;
  slug: string;
  number: string;
  title: string;
  description: string;
  order: number;
  icon: "shield" | "map" | "rules" | "scale" | "flask" | "chart" | "brain" | "flag";
  topics: string[];
  artifactLabel: string;
  artifactType: ArtifactType;
  lessons: Lesson[];
};

export type LessonProgress = {
  lessonId: string;
  contentVersion: number;
  status: LessonStatus;
  quizScore?: number;
  attempts: number;
  completedAt?: string;
};

export type ArtifactType =
  | "risk-declaration"
  | "observation"
  | "strategy"
  | "risk-policy"
  | "backtest-audit"
  | "scorecard"
  | "execution-checklist"
  | "trigger-plan"
  | "constitution"
  | "study-note";

export type PersonalRiskDeclaration = {
  purpose: string;
  tradingCapital: string;
  prohibitedBehaviors: string;
  maximumDrawdown: string;
  pauseConditions: string;
  passiveBenchmark: string;
  reviewFrequency: string;
  updatedAt: string;
};

export type StrategySpecification = {
  id: string;
  seriesId: string;
  name: string;
  version: number;
  hypothesis: string;
  assetUniverse: string[];
  timeframe: string;
  entryRules: string[];
  exitRules: string[];
  invalidationRules: string[];
  noTradeRules: string[];
  positionSizingRule: string;
  maximumExposure: string;
  benchmark: string;
  evaluationMetrics: string;
  knownLimitations: string;
  requiredData: string[];
  createdAt: string;
  updatedAt: string;
};

export type PortfolioRiskPolicy = {
  accountRiskPercent: string;
  maximumHeatPercent: string;
  correlationRule: string;
  sizingMethod: string;
  leverageBoundary: string;
  gapPlan: string;
  reviewTrigger: string;
  updatedAt: string;
};

export type BacktestAuditChecklist = {
  universeAndDates: EvidenceStatus;
  pointInTimeData: EvidenceStatus;
  outOfSample: EvidenceStatus;
  costsIncluded: EvidenceStatus;
  executionDelay: EvidenceStatus;
  delistedAssets: EvidenceStatus;
  reproducible: EvidenceStatus;
  limitations: string;
  updatedAt: string;
};

export type EvidenceStatus = "confirmed" | "missing" | "unknown";

export type StrategyScorecard = {
  observations: string;
  winRate: string;
  averageWin: string;
  averageLoss: string;
  maximumDrawdown: string;
  exposureTime: string;
  benchmarkResult: string;
  practicalSignificance: string;
  updatedAt: string;
};

export type ExecutionChecklist = {
  dataFreshness: string;
  liquidityCheck: string;
  spreadCheck: string;
  orderAssumption: string;
  alertFallback: string;
  counterpartyCheck: string;
  preReview: string;
  postReview: string;
  updatedAt: string;
};

export type BehaviouralTriggerPlan = {
  trigger: string;
  defaultResponse: string;
  pauseCondition: string;
  accountability: string;
  updatedAt: string;
};

export type TradingConstitution = {
  version: number;
  principles: string;
  permittedPractice: string;
  scalingRequirements: string;
  retirementConditions: string;
  reviewCadence: string;
  acknowledged: boolean;
  updatedAt: string;
};

export type JournalEntry = {
  id: string;
  market: string;
  observedAt: string;
  objectiveObservations: string[];
  assumptions: string[];
  decision: "observe" | "simulate" | "enter" | "exit" | "no_trade";
  strategyVersion?: number;
  ruleViolations: string[];
  review?: string;
  recordedAt?: string;
  marketContext?: {
    state: string;
    timeframe: string;
    flipLevel: string;
    capturedAt?: string;
  };
};

export type LearningArtifact = {
  id: string;
  type: ArtifactType;
  title: string;
  body: string;
  createdAt: string;
};

export type EducationState = {
  progress: Record<string, LessonProgress>;
  riskDeclaration?: PersonalRiskDeclaration;
  strategySpecifications: StrategySpecification[];
  riskPolicy?: PortfolioRiskPolicy;
  backtestAudit?: BacktestAuditChecklist;
  scorecard?: StrategyScorecard;
  executionChecklist?: ExecutionChecklist;
  triggerPlan?: BehaviouralTriggerPlan;
  constitution?: TradingConstitution;
  constitutionVersions: TradingConstitution[];
  journalEntries: JournalEntry[];
  artifacts: LearningArtifact[];
};

export const EDUCATION_STORAGE_KEY = "aperture.education.v2";
export const CONTENT_REVIEW_DATE = "2026-09-18";

export function createEmptyEducationState(): EducationState {
  return {
    progress: {},
    strategySpecifications: [],
    constitutionVersions: [],
    journalEntries: [],
    artifacts: [],
  };
}

const SEC_SOURCES: SourceReference[] = [
  { label: "SEC Investor.gov · Introduction to investing", href: "https://www.investor.gov/introduction-investing", scope: "General risk, diversification, emergency-fund separation, and long-horizon investing context." },
  { label: "SEC Investor.gov · How fees and expenses affect your portfolio", href: "https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/updated", scope: "How transaction and ongoing fees reduce investment outcomes." },
];
const FINRA_SOURCES: SourceReference[] = [
  { label: "FINRA · Investing", href: "https://www.finra.org/investors/investing", scope: "Investor education index and current product-risk references." },
  { label: "FINRA · Order types", href: "https://www.finra.org/investors/investing/investment-products/stocks/order-types", scope: "Market, limit, stop, and stop-limit execution tradeoffs." },
];
const CME_SOURCES: SourceReference[] = [
  { label: "CME Group · Position and risk management", href: "https://www.cmegroup.com/education/courses/things-to-know-before-trading-cme-futures/position-and-risk-management", scope: "Educational context for risk boundaries and position planning; not a source for the app’s bespoke formulas." },
];
const FIDELITY_SOURCES: SourceReference[] = [
  { label: "Fidelity · Average True Range (ATR)", href: "https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/atr", scope: "True-range inputs, Wilder-style ATR smoothing, and ATR’s non-directional volatility interpretation—not Supertrend rules." },
];
const CFA_SOURCES: SourceReference[] = [
  { label: "CFA Institute · Understanding investment risk", href: "https://www.cfainstitute.org/insights/articles/understanding-investment-risk", scope: "General discussion of investment-risk concepts and limits of single risk measures." },
  { label: "CFA Institute · Portfolio risk and return", href: "https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/portfolio-risk-return-part-2", scope: "Beta, systematic risk, CAPM assumptions, and risk-adjusted performance measures." },
];
const BACKTEST_SOURCE: SourceReference = {
  label: "CFA Institute · Backtesting & Simulation",
  href: "https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/backtesting-and-simulation",
  scope: "Rolling-window design, look-ahead and survivorship bias, simulation limits, and sensitivity analysis.",
};
const BEHAVIOUR_SOURCE: SourceReference = {
  label: "SEC Investor.gov · Behavioral Patterns of U.S. Investors",
  href: "https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-72",
  scope: "Documented investor-behavior patterns including disposition, past-performance, familiarity, mania/panic, momentum, and noise trading.",
};
const ORDER_QUALIFIERS_SOURCE: SourceReference = {
  label: "FINRA · Time Parameters and Qualifiers on Stock Orders",
  href: "https://www.finra.org/investors/insights/time-parameters-qualifiers-stock-orders",
  scope: "Partial fills, time-in-force choices, and execution qualifiers.",
};

function makeLesson(input: Omit<Lesson, "id" | "contentVersion" | "lastReviewedAt">): Lesson {
  return {
    ...input,
    id: `lesson-${input.slug}`,
    contentVersion: 2,
    lastReviewedAt: CONTENT_REVIEW_DATE,
  };
}

function makeModule(input: Omit<LearningModule, "id" | "order"> & { order: number }): LearningModule {
  return {
    ...input,
    id: `module-${input.number}`,
  };
}

export const learningModules: LearningModule[] = [
  makeModule({
    number: "01",
    slug: "protect-the-account",
    title: "Protect the account",
    description: "Start with boundaries that keep learning capital separate from identity, rent, and emergency reserves.",
    order: 0,
    icon: "shield",
    topics: ["risk before return", "trading versus investing", "no guaranteed returns", "market risk", "exchange risk", "liquidity risk", "custody risk", "pause conditions", "passive benchmarks", "capital boundaries"],
    artifactLabel: "Personal Risk Declaration",
    artifactType: "risk-declaration",
    lessons: [
      makeLesson({
        slug: "risk-before-return",
        title: "Risk comes before return",
        objective: "Distinguish volatility, drawdown, and permanent loss before choosing a practice boundary.",
        estimatedMinutes: 7,
        sources: [...SEC_SOURCES, ...FINRA_SOURCES],
        sections: [
          { heading: "Fact", body: "A return is an outcome over a period; risk is the range of ways that outcome can disappoint, including loss, illiquidity, gap risk, and the possibility that capital cannot be recovered.", evidenceType: "fact" },
          { heading: "A useful separation", body: "Volatility describes movement around a path. A drawdown describes decline from a prior peak. Permanent loss can come from insolvency, leverage, custody failure, or an inability to hold through a recovery.", evidenceType: "fact" },
          { heading: "Trading, investing, and uncertainty", body: "Investing commonly describes owning an asset for a longer-term objective; trading commonly describes shorter-horizon transactions or rule-based exposure changes. Both carry risk, neither has a guaranteed return, and this workspace teaches the distinction without recommending either approach.", evidenceType: "fact" },
          { heading: "Risk has several surfaces", body: "Market risk is movement in the asset’s value. Exchange or venue risk includes outages, rule changes, and access failure. Liquidity risk is the possibility that a position cannot be converted near the displayed price. Custody or counterparty risk concerns control, insolvency, or loss of access. These risks can overlap and are not reduced to one percentage.", evidenceType: "fact" },
          { heading: "Your rule", body: "A practice account should be funded only with capital whose loss would not compromise essential obligations. The declaration is a boundary-setting artifact, not a risk score or suitability conclusion.", evidenceType: "rule" },
        ],
        workedExample: "A 25% decline followed by a return to the starting value is a drawdown with recovery. A 25% loss caused by an asset becoming untradeable is a different risk: the path may not be recoverable.",
        commonMistakes: ["Treating a smooth historical chart as proof of safety.", "Using emergency savings as risk capital.", "Defining risk only as price volatility."],
        nextAction: "Write the Personal Risk Declaration before opening a lab or drafting a strategy.",
        exercise: { prompt: "Which statement is a boundary rather than a forecast?", options: ["I will pause after a 10% drawdown.", "This system will make 10% per month.", "This asset will recover soon."], answer: "I will pause after a 10% drawdown.", explanation: "A pause condition is a controllable process rule. The other statements make unsupported outcome claims." },
        quiz: [
          { id: "q1", prompt: "What is the main purpose of a risk declaration?", options: ["To predict returns", "To define capital and pause boundaries", "To select a winning asset"], answer: "To define capital and pause boundaries", explanation: "The declaration protects the learning process by defining constraints in advance." },
          { id: "q2", prompt: "Which risk can exist even when price volatility is low?", options: ["Custody or liquidity failure", "A guaranteed return", "A completed quiz"], answer: "Custody or liquidity failure", explanation: "Market risk is only one part of the risk surface." },
        ],
      }),
      makeLesson({
        slug: "pause-conditions-and-benchmarks",
        title: "When no practice is the right practice",
        objective: "Define a passive comparison and explicit conditions under which observation beats action.",
        estimatedMinutes: 6,
        sources: SEC_SOURCES,
        sections: [
          { heading: "Opportunity cost", body: "An active process uses time, attention, transaction costs, and emotional bandwidth. A passive benchmark makes that opportunity cost visible without claiming that either path will win.", evidenceType: "fact" },
          { heading: "No-trade conditions", body: "A missing price, stale candle, widened spread, broken data feed, unclear rule, or breached risk boundary can be a valid reason to record an observation and wait.", evidenceType: "rule" },
          { heading: "Assumption", body: "A benchmark is only comparable when dates, cash flows, fees, and measurement conventions are aligned. Otherwise the comparison can create a false sense of precision.", evidenceType: "assumption" },
        ],
        workedExample: "If a strategy is reviewed from January through June, its benchmark must use the same dates and contribution schedule. Comparing it with a full-year chart answers a different question.",
        commonMistakes: ["Treating cash as a failed investment rather than a comparison baseline.", "Comparing different dates or cash flows.", "Assuming a no-trade decision has no opportunity cost."],
        nextAction: "Choose a benchmark and write three no-trade conditions in your declaration.",
        exercise: { prompt: "Which is the strongest no-practice condition?", options: ["The data timestamp is older than the review window.", "The chart looks boring.", "A social post sounds confident."], answer: "The data timestamp is older than the review window.", explanation: "Data freshness is observable and relevant to whether the analysis is still valid." },
        quiz: [
          { id: "q1", prompt: "Why use a passive benchmark?", options: ["To guarantee outperformance", "To expose opportunity cost", "To create a buy signal"], answer: "To expose opportunity cost", explanation: "A benchmark is a comparison reference, not a promise." },
          { id: "q2", prompt: "Which is a valid no-trade condition?", options: ["A stale data timestamp", "A desire for excitement", "A green headline"], answer: "A stale data timestamp", explanation: "Stale data can invalidate an otherwise carefully defined observation." },
        ],
      }),
    ],
  }),
  makeModule({
    number: "02",
    slug: "understand-the-market-map",
    title: "Understand the market map",
    description: "Read OHLCV, timeframes, volatility, and the Supertrend record as descriptive data—not a command.",
    order: 1,
    icon: "map",
    topics: ["OHLCV", "candles and returns", "timeframes", "ATR", "Supertrend", "trend versus momentum", "market breadth", "flip level", "distance", "time since flip", "freshness"],
    artifactLabel: "Annotated Market Observation",
    artifactType: "observation",
    lessons: [
      makeLesson({
        slug: "read-a-market-row",
        title: "Read a market row without jumping to a conclusion",
        objective: "Separate objective fields in a market-monitor row from the assumptions required to act on them.",
        estimatedMinutes: 8,
        sources: [FIDELITY_SOURCES[0], ...FINRA_SOURCES],
        sections: [
          { heading: "Objective fields", body: "The Market Monitor can show a market, price, change, trend state, last confirmed flip, active flip level, distance, and time of the candle close. These describe the loaded provider snapshot.", evidenceType: "fact" },
          { heading: "Read the fields", body: "OHLCV records open, high, low, close, and volume for a stated candle interval. A return is a change between observations; it is not the same thing as a price level. Changing the timeframe changes the observation window and can change the story.", evidenceType: "fact" },
          { heading: "What it does not say", body: "A bullish state does not establish future direction, suitability, liquidity, expected return, or a complete strategy. Trend describes directional persistence in a chosen measure; momentum describes the rate or persistence of recent change. Neither removes stale-data or execution risk.", evidenceType: "unknown" },
          { heading: "Breadth and freshness", body: "Market breadth summarizes participation across a defined universe, but the meaning depends on membership, weighting, and timestamp. A fresh provider timestamp is evidence about capture time—not a promise that every underlying value is current.", evidenceType: "fact" },
          { heading: "Make the gap explicit", body: "An annotated observation should record what was seen, which assumptions would be required, and what evidence would invalidate the interpretation.", evidenceType: "rule" },
        ],
        workedExample: "Observation: ‘The 4-hour state is bullish and the latest candle closed at the captured timestamp.’ Assumption: ‘A strategy would need a declared entry, invalidation, sizing, and no-trade rule.’",
        commonMistakes: ["Calling a state a signal to buy.", "Ignoring the candle-close timestamp.", "Mixing a personal rule into an objective observation."],
        nextAction: "Open the Market Monitor, choose one row, and save an Annotated Market Observation.",
        exercise: { prompt: "Which sentence is an objective observation?", options: ["The weekly state changed from bearish to bullish.", "This is a strong opportunity.", "I should enter before it moves."], answer: "The weekly state changed from bearish to bullish.", explanation: "The first statement reports a displayed state without adding a forecast or instruction." },
        quiz: [
          { id: "q1", prompt: "What belongs in the objective observation section?", options: ["Displayed state and timestamp", "A promised return", "A hidden entry order"], answer: "Displayed state and timestamp", explanation: "Objective observations should be traceable to the visible data snapshot." },
          { id: "q2", prompt: "What does distance to flip measure?", options: ["Distance from price to the displayed flip level", "Probability of profit", "Position size"], answer: "Distance from price to the displayed flip level", explanation: "It is a descriptive distance, not a probability or a sizing instruction." },
        ],
      }),
      makeLesson({
        slug: "supertrend-anatomy",
        title: "Supertrend anatomy: ATR, bands, and flips",
        objective: "Trace how true range and ATR feed a trailing-band state, and why the result is lagging.",
        estimatedMinutes: 10,
        sources: [FIDELITY_SOURCES[0]],
        sections: [
          { heading: "True range", body: "True range is the largest of the current high-low range and the gaps from the previous close to the current high or low. It keeps overnight or between-candle movement visible.", evidenceType: "fact", sourceLabels: [FIDELITY_SOURCES[0].label] },
          { heading: "ATR and bands", body: "ATR smooths true range over a period. A Supertrend-style trail places bands around a midpoint using an ATR multiplier, then carries forward a band until a confirmed close crosses the prior trail.", evidenceType: "fact" },
          { heading: "Lag is a feature", body: "A confirmed close only arrives after movement has happened. The trail can reduce noise in a directional move while flipping repeatedly in a sideways range.", evidenceType: "fact" },
        ],
        workedExample: "If a candle closes beyond the prior bearish trail, the state may flip bullish on that confirmed candle. The flip is evidence of a rule condition, not evidence that the next candle must continue.",
        commonMistakes: ["Reading the current bar before it closes.", "Treating a flip as a forecast.", "Changing the ATR period after seeing the result."],
        nextAction: "Step through the Supertrend Anatomy Lab and label each calculation stage.",
        exercise: { prompt: "Why can a Supertrend flip late?", options: ["It waits for a confirmed close across a trailing band.", "It knows the future.", "It is a fixed price target."], answer: "It waits for a confirmed close across a trailing band.", explanation: "The confirmation rule trades early responsiveness for a more explicit state change." },
        quiz: [
          { id: "q1", prompt: "What does ATR primarily summarize?", options: ["Recent range and gap movement", "Company revenue", "Benchmark holdings"], answer: "Recent range and gap movement", explanation: "ATR is a volatility/range measure derived from true range." },
          { id: "q2", prompt: "What is a common sideways-market failure mode?", options: ["Repeated false flips", "Guaranteed compounding", "No data timestamp"], answer: "Repeated false flips", explanation: "A lagging trailing state can change repeatedly when price oscillates around the trail." },
        ],
      }),
    ],
  }),
  makeModule({
    number: "03",
    slug: "turn-an-indicator-into-a-strategy",
    title: "Turn an indicator into a strategy",
    description: "Move from a chart label to a falsifiable, versioned specification with entry, exit, invalidation, and no-trade rules.",
    order: 2,
    icon: "rules",
    topics: ["indicator versus strategy", "falsifiable hypotheses", "required data", "entry and exit", "invalidation", "timeframe consistency", "asset-universe rules", "re-entry and cooldown", "rule versioning", "no-trade rules"],
    artifactLabel: "Strategy Specification v1",
    artifactType: "strategy",
    lessons: [
      makeLesson({
        slug: "write-a-falsifiable-hypothesis",
        title: "Write a hypothesis that can be wrong",
        objective: "Convert an indicator observation into a measurable hypothesis with a defined universe and timeframe.",
        estimatedMinutes: 7,
        sources: FINRA_SOURCES,
        sections: [
          { heading: "Indicator versus strategy", body: "An indicator transforms data into a value or state. A strategy adds decision rules, position sizing, execution assumptions, costs, and evaluation criteria.", evidenceType: "fact" },
          { heading: "Falsifiability", body: "A useful hypothesis names the market universe, timeframe, observation window, and result metric. ‘Works well’ is not a testable outcome until those terms are defined.", evidenceType: "rule" },
          { heading: "Keep the sample consistent", body: "A timeframe rule should name the candle interval and how confirmation is defined; an asset-universe rule should name inclusion, exclusion, and membership timing. Changing either can change the question being tested.", evidenceType: "rule" },
          { heading: "Keep it versioned", body: "When a rule changes, record a new version. Otherwise it becomes impossible to tell whether an apparent improvement came from the strategy or from changing the question.", evidenceType: "rule" },
        ],
        workedExample: "Hypothesis: ‘Across a declared liquid spot universe, a confirmed 4-hour trend-state change followed at the next candle open may produce a different distribution of outcomes than a passive benchmark after stated costs.’",
        commonMistakes: ["Using a future result to define the rule.", "Adding filters only after reviewing outcomes.", "Leaving the market universe implicit."],
        nextAction: "Draft Strategy Specification v1 with one hypothesis and one timeframe.",
        exercise: { prompt: "Which hypothesis is falsifiable?", options: ["A confirmed state change has a measurable outcome distribution after costs.", "This setup feels powerful.", "This chart will probably work."], answer: "A confirmed state change has a measurable outcome distribution after costs.", explanation: "It names a trigger, a measurable outcome, and a cost boundary." },
        quiz: [
          { id: "q1", prompt: "What does a strategy add to an indicator?", options: ["Rules and evaluation assumptions", "Certainty", "A brokerage connection"], answer: "Rules and evaluation assumptions", explanation: "An indicator alone is not an executable or testable strategy specification." },
          { id: "q2", prompt: "Why version rules?", options: ["To preserve what question was tested", "To hide changes", "To promise better results"], answer: "To preserve what question was tested", explanation: "Versioning protects against silently changing the research question." },
        ],
      }),
      makeLesson({
        slug: "rules-and-invalidation",
        title: "Entry is only one part of the rule set",
        objective: "Specify exits, invalidation, sizing, and no-trade conditions before looking at performance.",
        estimatedMinutes: 9,
        sources: [CME_SOURCES[0], ...FINRA_SOURCES],
        sections: [
          { heading: "Complete the lifecycle", body: "A durable specification covers entry, exit, invalidation, re-entry, cooldown, sizing, maximum exposure, and what to do when data or execution assumptions fail.", evidenceType: "rule" },
          { heading: "Invalidation is not a prediction", body: "An invalidation level or condition says when the original hypothesis no longer applies. It does not claim the asset must continue in the opposite direction.", evidenceType: "fact" },
          { heading: "Do not rewrite mid-position", body: "Changing rules while exposed makes the observation incomparable with the declared system and often turns discomfort into a post-hoc justification.", evidenceType: "rule" },
        ],
        workedExample: "A specification can say: ‘If the confirmed state changes or the data freshness condition fails, record the outcome and exit the simulation at the next declared evaluation point.’ It should also state what happens if the market gaps through the assumed level.",
        commonMistakes: ["Defining only an entry trigger.", "Using ‘I will know it when I see it’ as an exit.", "Ignoring re-entry and cooldown behavior."],
        nextAction: "Add one invalidation rule and one no-trade rule to the playbook.",
        exercise: { prompt: "Which is an invalidation condition?", options: ["The declared rule condition no longer holds.", "The position is uncomfortable.", "A commentator changed tone."], answer: "The declared rule condition no longer holds.", explanation: "Invalidation is tied to the original hypothesis, not to emotion or commentary." },
        quiz: [
          { id: "q1", prompt: "What should be decided before evaluation?", options: ["Entry, exit, invalidation, and sizing", "The best headline", "A guaranteed outcome"], answer: "Entry, exit, invalidation, and sizing", explanation: "Pre-declared rules make later evidence more honest." },
          { id: "q2", prompt: "What problem does mid-position rule editing create?", options: ["An incomparable, post-hoc result", "Better data quality", "A passive benchmark"], answer: "An incomparable, post-hoc result", explanation: "The tested system changes while the observation is underway." },
        ],
      }),
    ],
  }),
  makeModule({
    number: "04",
    slug: "position-sizing-and-survival",
    title: "Position sizing and survival",
    description: "Translate a risk budget into position size while keeping portfolio heat, gaps, leverage, and nonlinear recovery visible.",
    order: 3,
    icon: "scale",
    topics: ["account risk", "position-size calculation", "stop distance", "volatility-adjusted sizing", "portfolio heat", "correlation", "risk of ruin", "leverage and liquidation", "gap and execution risk", "drawdown mathematics", "drawdown recovery"],
    artifactLabel: "Portfolio Risk Policy",
    artifactType: "risk-policy",
    lessons: [
      makeLesson({
        slug: "position-size-is-a-risk-output",
        title: "Position size is a risk output",
        objective: "Calculate size from account risk and invalidation distance rather than from conviction or a target return.",
        estimatedMinutes: 8,
        sources: [CME_SOURCES[0]],
        sections: [
          { heading: "Account risk", body: "A risk budget is the amount of account value permitted to be lost if the declared invalidation is reached. It is different from the notional value of a position.", evidenceType: "fact" },
          { heading: "Core arithmetic", body: "A simple teaching model is maximum units = permitted account risk ÷ (entry-to-invalidation distance + estimated per-unit costs). The result is an upper bound for analysis, not an order instruction.", evidenceType: "fact" },
          { heading: "Execution gap", body: "A market gap, spread change, partial fill, or fee surprise can make realized loss differ from the estimate. A policy should say how that uncertainty changes the permitted size.", evidenceType: "assumption" },
          { heading: "Volatility-adjusted sizing", body: "A volatility-adjusted rule changes units when a range or volatility measure changes, so a constant account-risk target is not assumed to produce constant realized loss. It is a modeling choice that still needs declared inputs, costs, and gap assumptions.", evidenceType: "assumption" },
        ],
        workedExample: "With $10,000 capital, a 0.5% risk budget permits $50 of modeled risk. If the invalidation distance plus estimated costs is $2.50 per unit, the model allows 20 units and $50 of modeled risk.",
        commonMistakes: ["Sizing from the amount one wants to make.", "Ignoring costs in a tight stop.", "Calling notional exposure the same as account risk."],
        nextAction: "Run the Position Size Lab with your own assumptions, then save the policy that limits the output.",
        exercise: { prompt: "What should make a position smaller?", options: ["A wider invalidation distance", "A louder headline", "A longer watchlist"], answer: "A wider invalidation distance", explanation: "A wider distance consumes more risk budget per unit in the teaching model." },
        quiz: [
          { id: "q1", prompt: "What drives maximum units in the lab?", options: ["Risk budget and per-unit loss estimate", "Headline confidence", "Number of followers"], answer: "Risk budget and per-unit loss estimate", explanation: "Size is derived from a declared risk boundary." },
          { id: "q2", prompt: "Why include fees and slippage?", options: ["They can change the realized loss", "They make returns certain", "They remove gap risk"], answer: "They can change the realized loss", explanation: "Costs are part of the path from a rule to an outcome." },
        ],
      }),
      makeLesson({
        slug: "heat-and-recovery",
        title: "Portfolio heat and nonlinear recovery",
        objective: "See why correlated exposure and drawdowns can overwhelm an otherwise reasonable single-position rule.",
        estimatedMinutes: 8,
        sources: [CME_SOURCES[0], SEC_SOURCES[0]],
        sections: [
          { heading: "Portfolio heat", body: "Portfolio heat is the sum of modeled risk across open or simultaneous positions. Several positions can share the same underlying driver even when their tickers differ.", evidenceType: "fact" },
          { heading: "Correlation is contextual", body: "Correlations can change during stress. A policy can cap total heat, group exposures by driver, and require a review before adding another position.", evidenceType: "rule" },
          { heading: "Recovery is asymmetric", body: "After a loss, the required gain is calculated from the lower base. A 50% loss requires a 100% gain to return to the starting value; this arithmetic is not a forecast.", evidenceType: "fact" },
          { heading: "Tail and financing risks", body: "Risk of ruin is a probability estimate that depends on assumptions about loss size, dependence, frequency, and the stopping boundary; it is not a universal score. Leverage magnifies exposure and can introduce margin or liquidation rules, so this education workspace does not facilitate leveraged execution. A gap can move through an assumed invalidation level and make the modeled loss larger.", evidenceType: "fact" },
        ],
        workedExample: "A 25% decline leaves 75% of the starting capital. Recovering to 100% requires 25 ÷ 75 = 33.3% growth on the remaining base.",
        commonMistakes: ["Adding independent-looking positions without a heat cap.", "Treating recovery percentages as symmetrical.", "Using leverage to ‘make back’ a loss."],
        nextAction: "Use the Drawdown Recovery Lab and write a heat cap into your Portfolio Risk Policy.",
        exercise: { prompt: "What does a 50% loss require to recover?", options: ["100%", "50%", "25%"], answer: "100%", explanation: "The remaining base is 50, so it must double to return to 100." },
        quiz: [
          { id: "q1", prompt: "What is portfolio heat?", options: ["Combined modeled risk across positions", "Daily price color", "A confidence score"], answer: "Combined modeled risk across positions", explanation: "Heat aggregates risk rather than looking at positions in isolation." },
          { id: "q2", prompt: "What is true after a 25% loss?", options: ["A 33.3% recovery is needed", "A 25% gain restores the start", "No recovery is needed"], answer: "A 33.3% recovery is needed", explanation: "25% of the original is 33.3% of the remaining 75%." },
        ],
      }),
    ],
  }),
  makeModule({
    number: "05",
    slug: "honest-backtesting",
    title: "Honest backtesting",
    description: "Build an evidence trail that shows what was known, what it cost, and where the method can fail.",
    order: 4,
    icon: "flask",
    topics: ["in-sample and out-of-sample", "look-ahead bias", "survivorship bias", "delisted assets", "data quality", "fees and spreads", "slippage", "execution delay", "parameter overfitting", "multiple-testing bias", "walk-forward", "minimum sample requirements", "reproducibility"],
    artifactLabel: "Backtest Audit Checklist",
    artifactType: "backtest-audit",
    lessons: [
      makeLesson({
        slug: "biases-and-data-quality",
        title: "Bias can look like edge",
        objective: "Identify look-ahead, survivorship, and data-quality failures before trusting a backtest result.",
        estimatedMinutes: 9,
        sources: [BACKTEST_SOURCE, SEC_SOURCES[0]],
        sections: [
          { heading: "Look-ahead bias", body: "Look-ahead bias uses information that was not available at the moment the decision would have been made. Even a small timestamp mistake can make a rule appear more precise than it was.", evidenceType: "fact", sourceLabels: [BACKTEST_SOURCE.label] },
          { heading: "Survivorship bias", body: "A universe containing only assets that remain visible today can omit delisted or failed instruments. The surviving sample may be healthier than the historical opportunity set.", evidenceType: "fact", sourceLabels: [BACKTEST_SOURCE.label] },
          { heading: "Data quality", body: "Missing candles, adjusted prices, duplicate bars, timezone mismatches, and stale quotes should be logged and either handled or excluded with a reason.", evidenceType: "rule" },
        ],
        workedExample: "A strategy that selects today’s top assets and then tests them back to 2018 has used future membership information. The historical universe needs to be reconstructed at each point in time.",
        commonMistakes: ["Using today’s survivors as the whole historical universe.", "Letting a charting library silently fill missing bars.", "Calling a clean data export ‘unbiased’ without an audit."],
        nextAction: "Complete the universe, timestamps, and data-quality sections of the Backtest Audit Checklist.",
        exercise: { prompt: "Which is look-ahead bias?", options: ["Using a future-ranked asset list in an earlier period", "Using a fixed start date", "Recording the data timestamp"], answer: "Using a future-ranked asset list in an earlier period", explanation: "The future list contains information unavailable at the earlier decision point." },
        quiz: [
          { id: "q1", prompt: "What does survivorship bias omit?", options: ["Assets that disappeared or were delisted", "Transaction costs", "Your quiz score"], answer: "Assets that disappeared or were delisted", explanation: "The surviving sample can make historical results look healthier." },
          { id: "q2", prompt: "Why log missing candles?", options: ["They affect what the rule could have known", "They guarantee a better result", "They choose the benchmark"], answer: "They affect what the rule could have known", explanation: "Missing data changes the evidence available to the strategy." },
        ],
      }),
      makeLesson({
        slug: "costs-and-walk-forward",
        title: "Costs, delay, and walk-forward checks",
        objective: "Stress a result with realistic costs and preserve an out-of-sample evaluation path.",
        estimatedMinutes: 8,
        sources: [FINRA_SOURCES[1], BACKTEST_SOURCE],
        sections: [
          { heading: "Costs are part of the rule", body: "Fees, spread, slippage, and execution delay convert a theoretical fill into a modeled outcome. They should be explicit inputs rather than a footnote.", evidenceType: "fact" },
          { heading: "In-sample versus out-of-sample", body: "In-sample data is used to define or tune a rule; out-of-sample data is held back until the choices are frozen. A walk-forward design repeats that separation through time, but it still cannot remove data, regime, or implementation uncertainty.", evidenceType: "fact" },
          { heading: "Out-of-sample", body: "An out-of-sample period is held back from the choices that define parameters. It is not a magic proof; it is one guard against fitting the past too closely.", evidenceType: "fact" },
          { heading: "Multiple tests and sample size", body: "Trying many universes, filters, or parameter combinations and keeping the most attractive result increases the chance of finding noise that looks like edge. A minimum sample should be justified for the question, outcome variance, and decision boundary; there is no universal sample-size pass mark.", evidenceType: "assumption" },
          { heading: "Reproducibility", body: "Record data sources, date ranges, parameters, code version, and assumptions so another person can recreate the same result and inspect its limits.", evidenceType: "rule" },
        ],
        workedExample: "If a strategy’s headline edge is 0.15% per observation and modeled costs are 0.12%, a small change in spread or delay can erase most of the apparent edge. That is a fragility result worth learning from.",
        commonMistakes: ["Testing at the close and assuming that close was tradable.", "Choosing parameters on the same data used to grade them.", "Reporting return without sample size or drawdown."],
        nextAction: "Toggle assumptions in the Backtest Integrity Lab until you can explain which input changes the result most.",
        exercise: { prompt: "What is an out-of-sample period for?", options: ["A held-back check on generalization", "A guaranteed validation", "A replacement for costs"], answer: "A held-back check on generalization", explanation: "It provides another test window while leaving its limitations visible." },
        quiz: [
          { id: "q1", prompt: "Which input belongs in an honest result?", options: ["Fees, spread, and delay", "Only the best fill", "A hidden parameter"], answer: "Fees, spread, and delay", explanation: "Execution assumptions materially affect small edges." },
          { id: "q2", prompt: "What should reproducibility capture?", options: ["Sources, dates, parameters, and version", "Only the final percentage", "A social-media screenshot"], answer: "Sources, dates, parameters, and version", explanation: "The evidence trail is part of the result." },
        ],
      }),
    ],
  }),
  makeModule({
    number: "06",
    slug: "evaluate-the-evidence",
    title: "Evaluate the evidence",
    description: "Look beyond headline return: expectancy, drawdown, exposure, benchmark-relative outcomes, and sample quality.",
    order: 5,
    icon: "chart",
    topics: ["win rate", "average win and loss", "expected value", "break-even win rate", "profit factor", "maximum drawdown", "exposure time", "volatility", "risk-adjusted return", "benchmark-relative performance", "beta versus alpha", "statistical significance", "practical significance"],
    artifactLabel: "Strategy Scorecard",
    artifactType: "scorecard",
    lessons: [
      makeLesson({
        slug: "expectancy-and-break-even",
        title: "Win rate is not expectancy",
        objective: "Calculate gross and net expectancy while keeping average wins, losses, costs, and sample size visible.",
        estimatedMinutes: 8,
        sources: [CME_SOURCES[0], CFA_SOURCES[0]],
        sections: [
          { heading: "Expected value", body: "A simple expectancy model weights average win and average loss by their observed probabilities. It is a summary of assumptions, not a promise that the next observation will match the average.", evidenceType: "fact" },
          { heading: "Break-even", body: "The break-even win rate depends on the size of wins, losses, and costs. A high win rate can still have negative expectancy when losses are much larger.", evidenceType: "fact" },
          { heading: "Sample warning", body: "Small samples are noisy. The lab flags fewer than 30 observations as inadequate for a confident conclusion, while acknowledging that 30 is a teaching threshold rather than a universal standard.", evidenceType: "assumption" },
        ],
        workedExample: "At a 45% win rate, average wins of 2.0%, average losses of -1.5%, and 0.2% cost per observation, gross expectancy is 0.45×2.0% + 0.55×-1.5% = 0.075%; after cost, net expectancy is -0.125% per observation. The arithmetic is illustrative, not a forecast.",
        commonMistakes: ["Optimizing for win rate alone.", "Omitting costs from a small edge.", "Treating a small sample as stable evidence."],
        nextAction: "Run the Expectancy Lab and save the inputs alongside the output in your Strategy Scorecard.",
        exercise: { prompt: "What can make a high win rate unhelpful?", options: ["Losses are much larger than wins", "A complete sample log", "A clear benchmark"], answer: "Losses are much larger than wins", explanation: "Expectancy depends on both the frequency and magnitude of outcomes." },
        quiz: [
          { id: "q1", prompt: "What does net expectancy subtract?", options: ["Modeled trading costs", "The benchmark name", "The quiz score"], answer: "Modeled trading costs", explanation: "Net expectancy includes the assumed cost per observation." },
          { id: "q2", prompt: "What does the sample warning communicate?", options: ["The result may be too noisy to rely on", "The strategy is guaranteed", "The benchmark is wrong"], answer: "The result may be too noisy to rely on", explanation: "The sample threshold is a caution, not a verdict." },
        ],
      }),
      makeLesson({
        slug: "drawdown-and-benchmark-context",
        title: "Headline return needs context",
        objective: "Use drawdown, exposure, volatility, and aligned benchmarks to interpret a result without overclaiming.",
        estimatedMinutes: 7,
        sources: [SEC_SOURCES[0], CFA_SOURCES[1]],
        sections: [
          { heading: "Path matters", body: "Two strategies with the same endpoint can have very different drawdowns, exposure time, volatility, and operational burden. The path is part of the evidence.", evidenceType: "fact" },
          { heading: "Profit factor is one ratio", body: "Profit factor is gross winning value divided by gross losing value for a defined sample. It omits timing, drawdown, exposure, and data quality unless those are reviewed beside it, so it is not a standalone quality score.", evidenceType: "fact" },
          { heading: "Benchmark-relative", body: "A passive comparison can show whether a result came from broad market exposure, a different cash-flow schedule, or something specific to the rules. It cannot identify ‘alpha’ from a single chart.", evidenceType: "assumption" },
          { heading: "Practical significance", body: "A small statistical edge can be unusable after costs, attention, taxes, liquidity limits, or emotional load. Record those limits in the scorecard.", evidenceType: "rule" },
          { heading: "Volatility and risk-adjusted return", body: "Volatility summarizes dispersion of returns under a chosen convention. A risk-adjusted return compares an outcome with the risk or variability used to obtain it; the result depends on the period, benchmark, and assumptions. Record the convention instead of treating one ratio as a verdict.", evidenceType: "fact" },
          { heading: "Beta, alpha, and significance", body: "Beta describes sensitivity to a chosen benchmark; alpha is a model-dependent residual relative to that benchmark and should not be inferred from a single endpoint. Statistical significance and practical usefulness are different questions, and neither guarantees future results.", evidenceType: "fact" },
        ],
        workedExample: "A strategy with a higher endpoint but twice the drawdown may not satisfy the same process boundary. The scorecard should make that tradeoff visible rather than collapsing it into one ranking.",
        commonMistakes: ["Ranking by endpoint only.", "Calling any benchmark difference alpha.", "Ignoring exposure time and operational effort."],
        nextAction: "Complete the scorecard with maximum drawdown, exposure time, and aligned benchmark notes.",
        exercise: { prompt: "Which metric describes the path from peak to trough?", options: ["Maximum drawdown", "Win rate", "Asset name"], answer: "Maximum drawdown", explanation: "Maximum drawdown describes the largest decline from a prior peak in the measured path." },
        quiz: [
          { id: "q1", prompt: "Why compare identical dates and cash flows?", options: ["To make the benchmark comparable", "To guarantee outperformance", "To remove uncertainty"], answer: "To make the benchmark comparable", explanation: "Alignment makes the comparison more meaningful, not more certain." },
          { id: "q2", prompt: "What is practical significance?", options: ["Whether an edge survives real constraints", "A promised return", "A chart color"], answer: "Whether an edge survives real constraints", explanation: "A theoretically positive result may still be impractical." },
        ],
      }),
    ],
  }),
  makeModule({
    number: "07",
    slug: "execution",
    title: "Execution",
    description: "Model the gap between a clean chart and a real venue: orders, fills, liquidity, alerts, downtime, and custody.",
    order: 6,
    icon: "rules",
    topics: ["market orders", "limit orders", "stop and stop-limit orders", "partial fills", "spread and price impact", "liquidity", "alert reliability", "stale data", "exchange downtime", "counterparty risk", "pre-trade checklist", "post-trade review"],
    artifactLabel: "Execution Checklist",
    artifactType: "execution-checklist",
    lessons: [
      makeLesson({
        slug: "orders-and-liquidity",
        title: "A chart price is not a fill",
        objective: "Explain how order type, spread, liquidity, and partial fills change the path from a rule to an outcome.",
        estimatedMinutes: 8,
        sources: [FINRA_SOURCES[1], ORDER_QUALIFIERS_SOURCE],
        sections: [
          { heading: "Order types", body: "Market, limit, stop, and stop-limit orders express different tradeoffs between price control and execution certainty. The education workspace describes them; it does not submit them.", evidenceType: "fact", sourceLabels: [FINRA_SOURCES[1].label] },
          { heading: "Liquidity", body: "A displayed price can be a small slice of available depth. Wider spreads, thin books, and partial fills can make the realized average price differ from the chart.", evidenceType: "fact" },
          { heading: "Checklist", body: "Record the data timestamp, venue status, spread assumption, fallback alert, and counterparty questions before treating a simulation as representative.", evidenceType: "rule" },
        ],
        workedExample: "For a simulated buy, a limit price can cap the maximum price paid but may not fill. A market order may execute more readily while leaving the fill price uncertain. The correct educational artifact is a declared assumption, not a universal answer.",
        commonMistakes: ["Assuming every simulated order fills at the last price.", "Ignoring partial fills.", "Treating liquidity as a permanent property."],
        nextAction: "Create an Execution Checklist that names your data and liquidity assumptions.",
        exercise: { prompt: "What can a limit order trade away?", options: ["Execution certainty", "The need for a benchmark", "Data freshness"], answer: "Execution certainty", explanation: "A limit order controls a price boundary but may remain unfilled." },
        quiz: [
          { id: "q1", prompt: "What can widen a realized entry price?", options: ["Spread and slippage", "A completed lesson", "A passive benchmark"], answer: "Spread and slippage", explanation: "Execution conditions are part of the modeled result." },
          { id: "q2", prompt: "What does this workspace do with order types?", options: ["Explain the tradeoffs without submitting orders", "Execute a brokerage order", "Guarantee a fill"], answer: "Explain the tradeoffs without submitting orders", explanation: "The product boundary is research and education, not execution." },
        ],
      }),
      makeLesson({
        slug: "stale-data-and-counterparty-risk",
        title: "When the venue or feed is the risk",
        objective: "Build pause and fallback behavior for stale data, exchange downtime, alert failure, and custody uncertainty.",
        estimatedMinutes: 6,
        sources: [SEC_SOURCES[0], FINRA_SOURCES[0]],
        sections: [
          { heading: "Freshness is a field", body: "A timestamp tells you when a provider snapshot was captured. It does not guarantee that every underlying venue was available or that a later decision can use the same values.", evidenceType: "fact" },
          { heading: "Operational failure", body: "Exchange downtime, alert delivery failure, API limits, and custody or counterparty events can prevent an otherwise valid rule from being observed or acted on.", evidenceType: "unknown" },
          { heading: "Pause first", body: "A safe process defines what happens when evidence is unavailable: record the gap, avoid inventing a value, and resume only after the declared condition is restored.", evidenceType: "rule" },
        ],
        workedExample: "If a market-monitor row is marked stale, a journal entry can record the last known state and the missing information. It should not transform that old state into a current claim.",
        commonMistakes: ["Filling a missing quote with an estimate and presenting it as live.", "Assuming an alert was delivered.", "Treating venue availability as an implementation detail."],
        nextAction: "Add a stale-data pause condition and fallback note to your Execution Checklist.",
        exercise: { prompt: "What should happen when a quote is stale?", options: ["Label it and pause the decision", "Invent a current value", "Call it real-time"], answer: "Label it and pause the decision", explanation: "The process should disclose missing information rather than hide it." },
        quiz: [
          { id: "q1", prompt: "What does a capture timestamp prove?", options: ["When the snapshot was captured", "That the data is current forever", "That a fill occurred"], answer: "When the snapshot was captured", explanation: "Freshness is time-bound and should be disclosed." },
          { id: "q2", prompt: "What is a safe fallback for missing evidence?", options: ["Record the gap and wait", "Guess silently", "Remove the disclaimer"], answer: "Record the gap and wait", explanation: "Unknown information should remain unknown." },
        ],
      }),
    ],
  }),
  makeModule({
    number: "08",
    slug: "behaviour-and-psychology",
    title: "Behaviour and psychology",
    description: "Study the human failure modes that turn a declared process into a different process under stress.",
    order: 7,
    icon: "brain",
    topics: ["FOMO", "loss aversion", "confirmation bias", "outcome bias", "overconfidence", "hesitation", "revenge trading", "sunk-cost behaviour", "rule modification under stress", "good decision versus profitable outcome", "trigger plans"],
    artifactLabel: "Behavioural Trigger Plan",
    artifactType: "trigger-plan",
    lessons: [
      makeLesson({
        slug: "decision-versus-outcome",
        title: "A good decision can lose",
        objective: "Separate process quality from outcome quality and recognize outcome bias in review.",
        estimatedMinutes: 7,
        sources: [BEHAVIOUR_SOURCE, FINRA_SOURCES[0]],
        sections: [
          { heading: "Outcome bias", body: "Outcome bias judges the quality of a decision mainly by what happened next. A rule-consistent decision can have a poor outcome, and a rule-breaking decision can have a lucky outcome.", evidenceType: "fact" },
          { heading: "Review the evidence", body: "A journal should compare the declared rule, available evidence, assumptions, and actual behavior. Profit or loss can be a separate field, not the only grade.", evidenceType: "rule" },
          { heading: "Make behavior observable", body: "Name the trigger, the default response, the pause condition, and an accountability mechanism before stress makes the choice feel urgent.", evidenceType: "rule" },
        ],
        workedExample: "A simulated entry can be process-consistent even if the next candle moves against it. The review asks whether the data, rule, size, and invalidation matched the specification—not whether the candle was kind.",
        commonMistakes: ["Rewriting a valid process because of one outcome.", "Calling a lucky rule break skill.", "Recording only winning observations."],
        nextAction: "Create a journal review that grades process and outcome separately.",
        exercise: { prompt: "Which review question reduces outcome bias?", options: ["Did I follow the declared rule with the information available then?", "Did the next candle make me money?", "Was the headline exciting?"], answer: "Did I follow the declared rule with the information available then?", explanation: "The question evaluates process against information available at the time." },
        quiz: [
          { id: "q1", prompt: "What is outcome bias?", options: ["Judging a decision mostly by its result", "Using a benchmark", "Recording a timestamp"], answer: "Judging a decision mostly by its result", explanation: "It collapses process quality into the outcome." },
          { id: "q2", prompt: "What belongs in a trigger plan?", options: ["Trigger, response, pause condition", "A return promise", "A secret signal"], answer: "Trigger, response, pause condition", explanation: "A plan makes the desired process concrete under stress." },
        ],
      }),
      makeLesson({
        slug: "fomo-and-rule-drift",
        title: "FOMO, revenge, and rule drift",
        objective: "Identify predictable stress triggers and pre-commit to responses that preserve learning quality.",
        estimatedMinutes: 8,
        sources: [BEHAVIOUR_SOURCE, ...FINRA_SOURCES],
        sections: [
          { heading: "Common triggers", body: "FOMO, loss aversion, confirmation bias, overconfidence, hesitation, revenge behavior, and sunk-cost thinking can each change a rule after the evidence is visible.", evidenceType: "fact" },
          { heading: "A response is a rule", body: "A trigger-response plan can say ‘wait for the next confirmed close’, ‘stop reviewing after a defined loss’, or ‘ask a second reviewer before changing a rule’. These are process controls, not performance claims.", evidenceType: "rule" },
          { heading: "Protect the journal", body: "Use the journal to record what you believed, what you knew, and what you did. A quiet ‘no trade’ record is valuable evidence of discipline.", evidenceType: "rule" },
        ],
        workedExample: "Trigger: a fast move after the review window. Response: log the missed observation and do not create a new rule until the scheduled review. This turns urgency into data rather than a new process.",
        commonMistakes: ["Treating urgency as evidence.", "Changing parameters after a single loss.", "Deleting no-trade observations."],
        nextAction: "Write one trigger-response pair for FOMO and one for rule modification under stress.",
        exercise: { prompt: "What is a process-preserving response to FOMO?", options: ["Record the missed case and wait for the next declared window", "Chase the move", "Double the size"], answer: "Record the missed case and wait for the next declared window", explanation: "It keeps the research process stable and creates a reviewable artifact." },
        quiz: [
          { id: "q1", prompt: "What does rule drift mean?", options: ["Changing the process under pressure", "Using a fixed version", "Comparing a benchmark"], answer: "Changing the process under pressure", explanation: "Rule drift makes outcomes difficult to interpret." },
          { id: "q2", prompt: "What should a no-trade record do?", options: ["Preserve the reason for waiting", "Hide uncertainty", "Claim missed profit"], answer: "Preserve the reason for waiting", explanation: "Observation is a valid, evidence-based decision state." },
        ],
      }),
    ],
  }),
  makeModule({
    number: "09",
    slug: "graduation",
    title: "Graduation",
    description: "Move deliberately from historical research to paper practice and only then review whether a controlled experiment is appropriate.",
    order: 8,
    icon: "flag",
    topics: ["historical testing", "paper trading", "forward testing", "live-practice boundary", "evidence requirements", "pause conditions", "strategy retirement", "monthly review", "rule-change governance"],
    artifactLabel: "Research Practice Constitution",
    artifactType: "constitution",
    lessons: [
      makeLesson({
        slug: "the-practice-ladder",
        title: "Historical, paper, forward, and controlled practice",
        objective: "Describe the evidence ladder and the additional uncertainty introduced at each stage.",
        estimatedMinutes: 8,
        sources: [SEC_SOURCES[0], CME_SOURCES[0]],
        sections: [
          { heading: "Four different questions", body: "Historical testing asks whether a rule could have behaved a certain way in recorded data. Paper practice asks whether the process can be followed in current conditions. Forward testing adds time and operational uncertainty. A controlled live experiment adds real financial and execution consequences.", evidenceType: "fact" },
          { heading: "No automatic graduation", body: "Evidence from one stage does not guarantee the next stage. Sample quality, costs, liquidity, personal constraints, and operational readiness still need review.", evidenceType: "rule" },
          { heading: "Scale only with evidence", body: "A constitution should define requirements for scaling, pause conditions, and retirement. It should require explicit acknowledgement when those rules change.", evidenceType: "rule" },
          { heading: "Live practice is a separate decision", body: "If someone independently considers a live experiment, even a small amount is real exposure with legal, tax, liquidity, custody, and execution consequences. This workspace neither recommends nor enables that step; it teaches a boundary for keeping research and paper practice separate until an appropriately qualified review has occurred.", evidenceType: "rule" },
        ],
        workedExample: "A clean historical result can justify a paper-test design, not a conclusion that live capital is appropriate. The next step should be chosen from evidence and boundaries, not excitement.",
        commonMistakes: ["Treating backtest approval as live approval.", "Scaling after a short favorable streak.", "Skipping operational rehearsal."],
        nextAction: "Draft a versioned Research Practice Constitution with acknowledgement and retirement conditions.",
        exercise: { prompt: "What does historical testing establish?", options: ["How a rule behaved in the tested historical assumptions", "That the future will repeat", "That live execution is safe"], answer: "How a rule behaved in the tested historical assumptions", explanation: "The conclusion must remain bounded by the data and assumptions." },
        quiz: [
          { id: "q1", prompt: "What changes when moving from paper to live practice?", options: ["Real financial and execution consequences", "The need for rules", "The existence of uncertainty"], answer: "Real financial and execution consequences", explanation: "Live practice adds consequences that historical and paper tests cannot fully represent." },
          { id: "q2", prompt: "When should a constitution require acknowledgement?", options: ["When the versioned rules change", "Only after a profit", "Never"], answer: "When the versioned rules change", explanation: "Explicit acknowledgement makes governance visible." },
        ],
      }),
      makeLesson({
        slug: "monthly-governance",
        title: "Review, pause, retire",
        objective: "Create a recurring review that can preserve, pause, revise, or retire a strategy without hiding the evidence.",
        estimatedMinutes: 7,
        sources: [CME_SOURCES[0], FINRA_SOURCES[0]],
        sections: [
          { heading: "Review cadence", body: "A monthly review can compare rule adherence, data quality, costs, drawdown, benchmark context, and behavioral notes. The cadence is a governance choice, not a market signal.", evidenceType: "rule" },
          { heading: "Retirement is information", body: "A strategy can be paused or retired when assumptions no longer hold, the data source changes, the drawdown boundary is breached, or the process is not reproducible.", evidenceType: "rule" },
          { heading: "Change one thing at a time", body: "If a rule changes, create a new version and preserve the previous evidence. Do not blend versions into one attractive history.", evidenceType: "fact" },
        ],
        workedExample: "A review can conclude ‘continue paper observation, no scaling’ because the data feed became stale or the sample remains too small. That is a complete governance decision.",
        commonMistakes: ["Using review to justify a desired outcome.", "Deleting a retired version.", "Changing multiple assumptions at once."],
        nextAction: "Acknowledge your constitution and set the next review date in your journal.",
        exercise: { prompt: "What is a valid retirement reason?", options: ["The strategy’s declared assumptions no longer hold", "A desire to chase a move", "A green day"], answer: "The strategy’s declared assumptions no longer hold", explanation: "Retirement protects the integrity of the evidence when the original question changes." },
        quiz: [
          { id: "q1", prompt: "What should a monthly review include?", options: ["Adherence, costs, drawdown, benchmark, behavior", "Only profit", "Only a chart screenshot"], answer: "Adherence, costs, drawdown, benchmark, behavior", explanation: "The review is about process quality and evidence, not one headline metric." },
          { id: "q2", prompt: "How should a material rule change be recorded?", options: ["As a new version with prior evidence preserved", "By overwriting history", "Without a date"], answer: "As a new version with prior evidence preserved", explanation: "Versioning keeps the research lineage intact." },
        ],
      }),
    ],
  }),
];

export function getLearningModule(slug: string) {
  return learningModules.find((module) => module.slug === slug);
}

export function getLesson(moduleSlug: string, lessonSlug: string) {
  return getLearningModule(moduleSlug)?.lessons.find((lesson) => lesson.slug === lessonSlug);
}

export function getAllLessons() {
  return learningModules.flatMap((module) => module.lessons);
}

export function getArtifactHref(type: ArtifactType) {
  if (type === "observation" || type === "trigger-plan") return "/app/journal";
  if (type === "backtest-audit" || type === "scorecard" || type === "execution-checklist") return "/app/review";
  return "/app/playbook";
}

export type PositionSizeInputs = {
  accountCapital: number;
  entryPrice: number;
  invalidationPrice: number;
  riskPercent: number;
  costPercent: number;
};

export type PositionSizeResult = {
  permittedRisk: number;
  riskPerUnit: number;
  costPerUnit: number;
  totalRiskPerUnit: number;
  riskLimitedUnits: number;
  cashLimitedUnits: number;
  maximumUnits: number;
  bindingConstraint: "risk budget" | "available capital" | "none";
  monetaryRisk: number;
  portfolioExposure: number;
  estimatedAllInLoss: number;
};

export function calculatePositionSize(inputs: PositionSizeInputs): PositionSizeResult {
  const accountCapital = Number.isFinite(inputs.accountCapital) ? Math.max(0, inputs.accountCapital) : 0;
  const entryPrice = Number.isFinite(inputs.entryPrice) ? Math.max(0, inputs.entryPrice) : 0;
  const invalidationPrice = Number.isFinite(inputs.invalidationPrice) ? Math.max(0, inputs.invalidationPrice) : 0;
  const riskPercent = Number.isFinite(inputs.riskPercent) ? Math.max(0, inputs.riskPercent) : 0;
  const costPercent = Number.isFinite(inputs.costPercent) ? Math.max(0, inputs.costPercent) : 0;
  const permittedRisk = accountCapital * riskPercent / 100;
  const riskPerUnit = Math.abs(entryPrice - invalidationPrice);
  const costPerUnit = entryPrice * costPercent / 100;
  const totalRiskPerUnit = riskPerUnit + costPerUnit;
  const riskLimitedUnits = totalRiskPerUnit > 0 ? permittedRisk / totalRiskPerUnit : 0;
  const cashLimitedUnits = entryPrice > 0 ? accountCapital / entryPrice : 0;
  const maximumUnits = Math.min(riskLimitedUnits, cashLimitedUnits);
  const bindingConstraint = maximumUnits <= 0
    ? "none"
    : riskLimitedUnits <= cashLimitedUnits
      ? "risk budget"
      : "available capital";
  const monetaryRisk = maximumUnits * riskPerUnit;
  const portfolioExposure = maximumUnits * entryPrice;
  const estimatedAllInLoss = maximumUnits * totalRiskPerUnit;
  return { permittedRisk, riskPerUnit, costPerUnit, totalRiskPerUnit, riskLimitedUnits, cashLimitedUnits, maximumUnits, bindingConstraint, monetaryRisk, portfolioExposure, estimatedAllInLoss };
}

export type ExpectancyInputs = {
  winProbabilityPercent: number;
  averageWinPercent: number;
  averageLossPercent: number;
  costPercent: number;
  observations: number;
};

export type ExpectancyResult = {
  grossExpectancyPercent: number;
  netExpectancyPercent: number;
  breakEvenWinRatePercent: number;
  expectedValuePercent: number;
  sampleWarning: string | null;
};

export function calculateExpectancy(inputs: ExpectancyInputs): ExpectancyResult {
  const winProbabilityPercent = Number.isFinite(inputs.winProbabilityPercent) ? inputs.winProbabilityPercent : 0;
  const averageWinPercent = Number.isFinite(inputs.averageWinPercent) ? inputs.averageWinPercent : 0;
  const averageLossPercent = Number.isFinite(inputs.averageLossPercent) ? inputs.averageLossPercent : 0;
  const costPercent = Number.isFinite(inputs.costPercent) ? inputs.costPercent : 0;
  const observations = Number.isFinite(inputs.observations) ? Math.max(0, inputs.observations) : 0;
  const winProbability = Math.min(100, Math.max(0, winProbabilityPercent)) / 100;
  const averageWin = Math.max(0, averageWinPercent);
  const averageLoss = Math.min(0, averageLossPercent);
  const cost = Math.max(0, costPercent);
  const grossExpectancyPercent = winProbability * averageWin + (1 - winProbability) * averageLoss;
  const netExpectancyPercent = grossExpectancyPercent - cost;
  const breakEvenWinRatePercent = averageWin + Math.abs(averageLoss) === 0
    ? 0
    : ((Math.abs(averageLoss) + cost) / (averageWin + Math.abs(averageLoss))) * 100;
  const expectedValuePercent = netExpectancyPercent * observations;
  return {
    grossExpectancyPercent,
    netExpectancyPercent,
    breakEvenWinRatePercent,
    expectedValuePercent,
    sampleWarning: observations < 30 ? "Fewer than 30 observations: treat this as a noisy teaching sample, not a conclusion." : null,
  };
}

export function calculateRecoveryPercent(lossPercent: number) {
  const loss = Math.min(99.9, Math.max(0, lossPercent));
  return loss === 0 ? 0 : (loss / (100 - loss)) * 100;
}

export type BacktestIntegrityInputs = {
  headlineEdgePercent: number;
  feeDragPercent: number;
  spreadDragPercent: number;
  slippageDragPercent: number;
  executionDelayDragPercent: number;
  survivorshipStatus: EvidenceStatus;
  overfitPenalty: number;
};

export type BacktestIntegrityResult = {
  adjustedEdgePercent: number;
  totalDragPercent: number;
  warnings: string[];
};

export function calculateBacktestIntegrity(inputs: BacktestIntegrityInputs): BacktestIntegrityResult {
  const finiteDrag = (value: number) => Math.max(0, Number.isFinite(value) ? value : 0);
  const drags = [inputs.feeDragPercent, inputs.spreadDragPercent, inputs.slippageDragPercent, inputs.executionDelayDragPercent, inputs.overfitPenalty].map(finiteDrag);
  const totalDragPercent = drags.reduce((total, drag) => total + drag, 0);
  const headlineEdgePercent = Number.isFinite(inputs.headlineEdgePercent) ? inputs.headlineEdgePercent : 0;
  const adjustedEdgePercent = headlineEdgePercent - totalDragPercent;
  const warnings = [
    inputs.executionDelayDragPercent > 0 ? "An explicit execution-delay drag is included; the assumed value still needs evidence." : "Execution-delay drag is zero; the result may be optimistic.",
    inputs.survivorshipStatus === "confirmed" ? "The point-in-time universe is marked reconstructed; retain the supporting evidence." : inputs.survivorshipStatus === "missing" ? "Point-in-time membership is missing, so the adjusted edge cannot resolve survivorship bias." : "Survivorship status is unknown; do not treat the adjusted edge as an audited result.",
    inputs.overfitPenalty > 0 ? "Parameter fragility is being penalized." : "No parameter-overfit penalty is applied.",
  ];
  return { adjustedEdgePercent, totalDragPercent, warnings };
}

export type SupertrendAnatomyStep = {
  index: number;
  candle: { open: number; high: number; low: number; close: number };
  trueRange: number;
  atr: number | null;
  midpoint: number;
  basicUpper: number;
  basicLower: number;
  finalUpper: number | null;
  finalLower: number | null;
  trend: "bullish" | "bearish" | "warming";
  event: string;
};

const anatomyCandles = [
  { open: 100, high: 104, low: 98, close: 102 },
  { open: 102, high: 106, low: 100, close: 105 },
  { open: 105, high: 107, low: 101, close: 102 },
  { open: 102, high: 103, low: 90, close: 92 },
  { open: 98, high: 101, low: 95, close: 100 },
  { open: 100, high: 108, low: 99, close: 107 },
  { open: 107, high: 111, low: 105, close: 109 },
  { open: 109, high: 110, low: 102, close: 103 },
];

export function buildSupertrendAnatomy(period = 3, multiplier = 1.8): SupertrendAnatomyStep[] {
  const trueRanges = anatomyCandles.map((candle, index) => {
    const previousClose = index > 0 ? anatomyCandles[index - 1].close : candle.close;
    return index === 0
      ? candle.high - candle.low
      : Math.max(candle.high - candle.low, Math.abs(candle.high - previousClose), Math.abs(candle.low - previousClose));
  });
  const atrValues = new Array<number | null>(trueRanges.length).fill(null);
  if (Number.isInteger(period) && period > 0 && trueRanges.length >= period) {
    let previousAtr = trueRanges.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
    atrValues[period - 1] = previousAtr;
    for (let index = period; index < trueRanges.length; index += 1) {
      previousAtr = (previousAtr * (period - 1) + trueRanges[index]) / period;
      atrValues[index] = previousAtr;
    }
  }
  const steps: SupertrendAnatomyStep[] = [];
  let previousUpper: number | null = null;
  let previousLower: number | null = null;
  let trend: 1 | -1 = 1;
  anatomyCandles.forEach((candle, index) => {
    const atr = atrValues[index];
    const midpoint = (candle.high + candle.low) / 2;
    const basicUpper = midpoint - (atr ?? 0) * multiplier;
    const basicLower = midpoint + (atr ?? 0) * multiplier;
    const previousClose = index > 0 ? anatomyCandles[index - 1].close : candle.close;
    const finalUpper = atr == null ? null : previousClose > (previousUpper ?? basicUpper) ? Math.max(basicUpper, previousUpper ?? basicUpper) : basicUpper;
    const finalLower = atr == null ? null : previousClose < (previousLower ?? basicLower) ? Math.min(basicLower, previousLower ?? basicLower) : basicLower;
    const priorTrend = trend;
    if (previousLower != null && trend === -1 && candle.close > previousLower) {
      trend = 1;
    } else if (previousUpper != null && trend === 1 && candle.close < previousUpper) {
      trend = -1;
    }
    const event = atr == null
      ? "Collecting enough candles for ATR"
      : priorTrend !== trend
        ? `Confirmed ${trend === 1 ? "bullish" : "bearish"} flip on the close`
        : "Trail carried forward; no state change";
    steps.push({ index, candle, trueRange: trueRanges[index], atr, midpoint, basicUpper, basicLower, finalUpper, finalLower, trend: atr == null ? "warming" : trend === 1 ? "bullish" : "bearish", event });
    if (finalUpper != null) previousUpper = finalUpper;
    if (finalLower != null) previousLower = finalLower;
  });
  return steps;
}
