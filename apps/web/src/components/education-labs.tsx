"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FlaskConical,
  Gauge,
  GitCompareArrows,
  Layers3,
  LineChart,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import {
  buildSupertrendAnatomy,
  calculateBacktestIntegrity,
  calculateExpectancy,
  calculatePositionSize,
  calculateRecoveryPercent,
} from "@/lib/education";

type LabId = "position" | "expectancy" | "drawdown" | "supertrend" | "integrity" | "benchmark";

const labs: Array<{ id: LabId; label: string; description: string }> = [
  { id: "position", label: "Position size", description: "Translate a risk budget into a modeled size." },
  { id: "expectancy", label: "Expectancy", description: "See how win rate, payoff, cost, and sample interact." },
  { id: "drawdown", label: "Drawdown recovery", description: "Make asymmetric recovery arithmetic visible." },
  { id: "supertrend", label: "Supertrend anatomy", description: "Step through true range, ATR, bands, and state." },
  { id: "integrity", label: "Backtest integrity", description: "Stress a fragile edge with realistic assumptions." },
  { id: "benchmark", label: "Benchmark", description: "Compare aligned scenario assumptions side by side." },
];

function Field({ label, value, onChange, prefix, min, max, step = "any" }: { label: string; value: string; onChange: (value: string) => void; prefix?: string; min?: number; max?: number; step?: string }) {
  return <label className="block text-xs text-zinc-400"><span>{label}</span><span className="relative mt-2 block">{prefix ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-zinc-300">{prefix}</span> : null}<input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} className={`h-11 w-full rounded-[0.7rem] border border-white/10 bg-black/20 ${prefix ? "pl-7" : "px-3"} pr-3 font-mono text-base text-white outline-none focus:border-cyan-200/30 focus:ring-2 focus:ring-cyan-200/10 sm:text-sm`} /></span></label>;
}

function TextInput({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: "text" | "date"; placeholder?: string }) {
  return <label className="block text-xs text-zinc-400"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={type === "text" ? 120 : undefined} className="mt-2 h-11 w-full rounded-[0.7rem] border border-white/10 bg-black/20 px-3 font-mono text-base text-white outline-none placeholder:text-zinc-400 focus:border-cyan-200/30 focus:ring-2 focus:ring-cyan-200/10 sm:text-sm [color-scheme:dark]" /></label>;
}

function Metric({ label, value, detail, tone = "default" }: { label: string; value: string; detail?: string; tone?: "default" | "positive" | "warning" }) {
  return <div className="rounded-[0.85rem] border border-white/[0.07] bg-black/20 p-4"><p className="text-xs text-zinc-300">{label}</p><p className={`mt-3 truncate font-mono text-xl ${tone === "positive" ? "text-emerald-100" : tone === "warning" ? "text-amber-100" : "text-white"}`}>{value}</p>{detail ? <p className="mt-2 text-[0.68rem] leading-5 text-zinc-300">{detail}</p> : null}</div>;
}

function ValidationMessage({ children }: { children: ReactNode }) {
  return <p role="alert" className="mt-5 flex items-start gap-2 rounded-[0.8rem] border border-amber-200/15 bg-amber-200/[0.04] p-3 text-xs leading-5 text-amber-50/85"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{children}</p>;
}

function hasFiniteInput(value: string) {
  return value.trim() !== "" && Number.isFinite(Number(value));
}

function LabFrame({ children, title, description, icon: Icon }: { children: ReactNode; title: string; description: string; icon: typeof FlaskConical }) {
  return <section className="glass-surface rounded-[1.1rem] p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded-[0.75rem] bg-cyan-200/[0.055] text-cyan-100"><Icon className="size-4" aria-hidden="true" /></span><div><h2 className="type-card-title text-xl text-white">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">{description}</p></div></div><div className="mt-6">{children}</div></section>;
}

function PositionSizeLab() {
  const [capital, setCapital] = useState("10000");
  const [entry, setEntry] = useState("100");
  const [invalidation, setInvalidation] = useState("95");
  const [risk, setRisk] = useState("0.5");
  const [cost, setCost] = useState("0.2");
  const rawValues = [capital, entry, invalidation, risk, cost];
  const values = rawValues.map(Number);
  const valid = rawValues.every(hasFiniteInput) && values[0] > 0 && values[1] > 0 && values[2] > 0 && values[1] !== values[2] && values[3] > 0 && values[3] <= 100 && values[4] >= 0 && values[4] <= 100;
  const result = calculatePositionSize({ accountCapital: values[0], entryPrice: values[1], invalidationPrice: values[2], riskPercent: values[3], costPercent: values[4] });
  return <LabFrame title="Position size lab" description="Change the assumptions and watch the upper bound respond. This cash-only model never sizes exposure above the stated account capital." icon={Gauge}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"><Field label="Account capital" prefix="$" value={capital} onChange={setCapital} min={0} /><Field label="Entry price" prefix="$" value={entry} onChange={setEntry} min={0} /><Field label="Invalidation level" prefix="$" value={invalidation} onChange={setInvalidation} min={0} /><Field label="Permitted account risk (%)" value={risk} onChange={setRisk} min={0} max={100} step="0.1" /><Field label="Round-trip cost per unit (%)" value={cost} onChange={setCost} min={0} max={100} step="0.05" /></div>{valid ? <><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite"><Metric label="Risk per unit" value={`$${result.riskPerUnit.toFixed(2)}`} detail="Absolute entry-to-invalidation distance" /><Metric label="Maximum position" value={result.maximumUnits.toFixed(2)} detail={`Modeled units · limited by ${result.bindingConstraint}`} tone="positive" /><Metric label="Portfolio exposure" value={`$${result.portfolioExposure.toFixed(2)}`} detail="Cash exposure, capped at account capital" /><Metric label="Estimated invalidation loss" value={`$${result.estimatedAllInLoss.toFixed(2)}`} detail={`Risk budget $${result.permittedRisk.toFixed(2)} including modeled cost`} tone="warning" /></div><p className="mt-5 rounded-[0.8rem] bg-cyan-200/[0.035] p-3 text-xs leading-5 text-cyan-50/80">Assumption boundary: the cost is a simplified round-trip percentage of entry price per unit. The result is rounded only for display and does not model leverage, short-sale mechanics, gaps, changing spreads, partial fills, taxes, or venue-specific fees.</p></> : <ValidationMessage>Enter finite positive capital, entry, and invalidation values; use a distinct invalidation level, risk from 0–100%, and all-in cost from 0–100%.</ValidationMessage>}</LabFrame>;
}

function ExpectancyLab() {
  const [winRate, setWinRate] = useState("45");
  const [averageWin, setAverageWin] = useState("2");
  const [averageLoss, setAverageLoss] = useState("-1.5");
  const [cost, setCost] = useState("0.2");
  const [observations, setObservations] = useState("20");
  const rawValues = [winRate, averageWin, averageLoss, cost, observations];
  const values = rawValues.map(Number);
  const valid = rawValues.every(hasFiniteInput) && values[0] >= 0 && values[0] <= 100 && values[1] >= 0 && values[2] <= 0 && values[3] >= 0 && Number.isInteger(values[4]) && values[4] >= 0;
  const result = calculateExpectancy({ winProbabilityPercent: values[0], averageWinPercent: values[1], averageLossPercent: values[2], costPercent: values[3], observations: values[4] });
  return <LabFrame title="Expectancy lab" description="Expected value is a weighted summary of per-observation assumptions. It is not a forecast for the next observation." icon={LineChart}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"><Field label="Win probability (%)" value={winRate} onChange={setWinRate} min={0} max={100} step="1" /><Field label="Average win (%)" value={averageWin} onChange={setAverageWin} min={0} step="0.1" /><Field label="Average loss (%)" value={averageLoss} onChange={setAverageLoss} max={0} step="0.1" /><Field label="Cost / observation (%)" value={cost} onChange={setCost} min={0} step="0.05" /><Field label="Observations" value={observations} onChange={setObservations} min={0} step="1" /></div>{valid ? <><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Gross expectancy" value={`${result.grossExpectancyPercent.toFixed(3)}%`} detail="Weighted average before modeled costs" /><Metric label="Net expectancy" value={`${result.netExpectancyPercent.toFixed(3)}%`} detail="After modeled cost per observation" tone={result.netExpectancyPercent >= 0 ? "positive" : "warning"} /><Metric label="Break-even win rate" value={`${result.breakEvenWinRatePercent.toFixed(2)}%`} detail="Given the payoff and cost assumptions" /><Metric label="Sum across observations" value={`${result.expectedValuePercent.toFixed(2)}%`} detail={`Simple linear ${observations || "0"}-observation arithmetic`} /></div>{result.sampleWarning ? <p className="mt-5 flex items-start gap-2 rounded-[0.8rem] bg-amber-200/[0.05] p-3 text-xs leading-5 text-amber-50/80"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{result.sampleWarning}</p> : null}</> : <ValidationMessage>Use a win rate from 0–100%, non-negative average wins, non-positive average losses, non-negative cost, and a whole-number observation count.</ValidationMessage>}</LabFrame>;
}

function DrawdownLab() {
  const [loss, setLoss] = useState("25");
  const recovery = calculateRecoveryPercent(Number(loss));
  const examples = [10, 25, 50, 75];
  return <LabFrame title="Drawdown recovery lab" description="Losses and recoveries are calculated from different bases. Use the slider to make the asymmetry tangible." icon={BarChart3}><div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-center"><div><label className="text-xs text-zinc-400">Drawdown <span className="font-mono text-cyan-100">{Number(loss).toFixed(0)}%</span><input type="range" min="0" max="90" step="1" value={loss} onChange={(event) => setLoss(event.target.value)} className="mt-5 w-full accent-cyan-200" /></label><div className="mt-6 h-5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-rose-200/70 transition-[width]" style={{ width: `${Math.min(100, Number(loss))}%` }} /></div><p className="mt-3 text-xs text-zinc-300">Remaining base: {(100 - Number(loss)).toFixed(0)}%</p></div><div className="rounded-[1rem] border border-amber-200/15 bg-amber-200/[0.04] p-5"><p className="text-xs uppercase tracking-[0.14em] text-amber-100/70">Required recovery</p><p className="mt-3 font-mono text-4xl text-white">{recovery.toFixed(1)}%</p><p className="mt-2 text-xs leading-5 text-zinc-300">Arithmetic on the remaining capital, not a performance expectation.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-4">{examples.map((example) => <button key={example} type="button" onClick={() => setLoss(String(example))} className={`rounded-[0.85rem] border p-4 text-left transition ${Number(loss) === example ? "border-cyan-200/25 bg-cyan-200/[0.06]" : "border-white/[0.07] bg-black/20 hover:bg-white/[0.04]"}`}><p className="font-mono text-sm text-rose-100">-{example}%</p><p className="mt-2 font-mono text-lg text-white">+{calculateRecoveryPercent(example).toFixed(1)}%</p><p className="mt-1 text-[0.68rem] text-zinc-300">needed to recover</p></button>)}</div></LabFrame>;
}

function SupertrendLab() {
  const steps = useMemo(() => buildSupertrendAnatomy(), []);
  const [index, setIndex] = useState(2);
  const step = steps[index];
  return <LabFrame title="Supertrend anatomy lab" description="Illustrative sample data only. This trace uses the market monitor’s deployed calculation vocabulary: RMA ATR, an upper trail below the midpoint, a lower trail above it, and flips only after a close crosses the prior trail." icon={Layers3}><div className="grid gap-6 lg:grid-cols-[1fr_19rem] lg:items-start"><div><div className="flex items-center justify-between gap-3"><p className="text-xs uppercase tracking-[0.14em] text-zinc-300">Candle {index + 1} of {steps.length}</p><span className={`rounded-full border px-2 py-1 text-[0.62rem] uppercase tracking-[0.1em] ${step.trend === "bullish" ? "border-emerald-200/15 text-emerald-100" : step.trend === "bearish" ? "border-rose-200/15 text-rose-100" : "border-white/10 text-zinc-300"}`}>{step.trend}</span></div><input aria-label={`Select anatomy candle ${index + 1} of ${steps.length}`} type="range" min="0" max={steps.length - 1} value={index} onChange={(event) => setIndex(Number(event.target.value))} className="mt-5 w-full accent-cyan-200" /><div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="True range" value={step.trueRange.toFixed(2)} detail="High-low / gap-aware range" /><Metric label="RMA ATR" value={step.atr == null ? "warming" : step.atr.toFixed(2)} detail="Three-candle deployed-method window" /><Metric label="Midpoint" value={step.midpoint.toFixed(2)} detail="(High + low) / 2" /></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><Metric label="Basic upper trail" value={step.atr == null ? "warming" : step.basicUpper.toFixed(2)} detail="Midpoint − multiplier × RMA ATR" /><Metric label="Basic lower trail" value={step.atr == null ? "warming" : step.basicLower.toFixed(2)} detail="Midpoint + multiplier × RMA ATR" /></div></div><div className="rounded-[1rem] border border-cyan-200/15 bg-cyan-200/[0.035] p-5"><p className="text-xs uppercase tracking-[0.14em] text-cyan-100/70">What happened</p><p className="mt-4 text-sm leading-6 text-zinc-300">{step.event}</p><div className="mt-5 space-y-3 border-t border-white/[0.06] pt-4 text-xs text-zinc-300"><p>OHLC: <span className="font-mono text-zinc-300">{step.candle.open.toFixed(0)} / {step.candle.high.toFixed(0)} / {step.candle.low.toFixed(0)} / {step.candle.close.toFixed(0)}</span></p><p>Final upper trail: <span className="font-mono text-zinc-300">{step.finalUpper?.toFixed(2) ?? "warming"}</span></p><p>Final lower trail: <span className="font-mono text-zinc-300">{step.finalLower?.toFixed(2) ?? "warming"}</span></p></div></div></div><p className="mt-5 text-xs leading-5 text-zinc-300">A confirmed state is lagging by design and can flip repeatedly in a sideways range. The app’s live market monitor remains the source of current provider data; this lab is an explainable illustration, not a current signal or forecast.</p></LabFrame>;
}

function BacktestIntegrityLab() {
  const [headline, setHeadline] = useState("1");
  const [fees, setFees] = useState("0.08");
  const [spread, setSpread] = useState("0.10");
  const [slippage, setSlippage] = useState("0.14");
  const [delay, setDelay] = useState("0.18");
  const [survivorship, setSurvivorship] = useState<"confirmed" | "missing" | "unknown">("unknown");
  const [overfit, setOverfit] = useState("0");
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [parameterValue, setParameterValue] = useState("ATR 10 × 3");
  const headlineValue = Number(headline);
  const overfitValue = Number(overfit);
  const quantitativeDrags = [fees, spread, slippage, delay, overfit];
  const datesValid = Boolean(startDate && endDate && startDate <= endDate);
  const valid = hasFiniteInput(headline) && quantitativeDrags.every(hasFiniteInput) && quantitativeDrags.every((value) => Number(value) >= 0) && datesValid && Boolean(parameterValue.trim());
  const result = calculateBacktestIntegrity({ headlineEdgePercent: headlineValue, feeDragPercent: Number(fees), spreadDragPercent: Number(spread), slippageDragPercent: Number(slippage), executionDelayDragPercent: Number(delay), survivorshipStatus: survivorship, overfitPenalty: overfitValue });
  return <LabFrame title="Backtest integrity lab" description="Stress a hypothetical edge with values you can inspect and defend. No hidden default penalty is presented as market truth, and this is not a historical backtest." icon={SlidersHorizontal}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Headline edge / observation (%)" value={headline} onChange={setHeadline} step="0.1" /><Field label="Fee drag / observation (%)" value={fees} onChange={setFees} min={0} step="0.01" /><Field label="Spread drag / observation (%)" value={spread} onChange={setSpread} min={0} step="0.01" /><Field label="Slippage drag / observation (%)" value={slippage} onChange={setSlippage} min={0} step="0.01" /><Field label="Execution-delay drag (%)" value={delay} onChange={setDelay} min={0} step="0.01" /><Field label="Parameter-fragility penalty (%)" value={overfit} onChange={setOverfit} min={0} step="0.1" /></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><TextInput label="Start date" type="date" value={startDate} onChange={setStartDate} /><TextInput label="End date" type="date" value={endDate} onChange={setEndDate} /><TextInput label="Parameter values" value={parameterValue} onChange={setParameterValue} placeholder="ATR period × multiplier" /><label className="block text-xs text-zinc-300">Point-in-time universe<select value={survivorship} onChange={(event) => setSurvivorship(event.target.value as typeof survivorship)} className="mt-2 h-11 w-full rounded-[0.7rem] border border-white/10 bg-[#0c1213] px-3 text-base text-white outline-none focus:border-cyan-200/30 sm:text-sm"><option value="unknown">Unknown</option><option value="missing">Missing / survivor-only</option><option value="confirmed">Reconstructed with evidence</option></select></label></div>{valid ? <><div className="mt-5 grid gap-3 sm:grid-cols-3" aria-live="polite"><Metric label="Modeled edge" value={`${result.adjustedEdgePercent.toFixed(2)}%`} detail={`Headline ${headlineValue.toFixed(2)}% − explicit drag ${result.totalDragPercent.toFixed(2)}%`} tone={result.adjustedEdgePercent > 0 ? "positive" : "warning"} /><Metric label="Quantitative drag" value={`${result.totalDragPercent.toFixed(2)}%`} detail="Sum of the five user-entered stress assumptions" /><Metric label="Method status" value={survivorship === "confirmed" && result.adjustedEdgePercent > 0 ? "Still unverified" : "Needs attention"} detail="A teaching label, never a validation verdict" tone="warning" /></div><p className="mt-5 rounded-[0.8rem] bg-black/20 p-3 text-xs leading-5 text-zinc-300">Dates and parameters document the hypothetical question; this lab does not load historical data. The survivorship status is qualitative and never converted into an invented percentage.</p><div className="mt-5 space-y-2">{result.warnings.map((warning) => <p key={warning} className="flex items-start gap-2 text-xs leading-5 text-zinc-300"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-cyan-100/70" aria-hidden="true" />{warning}</p>)}</div></> : <ValidationMessage>Enter finite non-negative drag assumptions, an ordered date window, and parameter notes.</ValidationMessage>}</LabFrame>;
}

function BenchmarkLab() {
  const [benchmark, setBenchmark] = useState("BTC buy-and-hold");
  const [strategy, setStrategy] = useState("18");
  const [btc, setBtc] = useState("22");
  const [cash, setCash] = useState("4");
  const [periodic, setPeriodic] = useState("12");
  const [customBenchmark, setCustomBenchmark] = useState("10");
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [costs, setCosts] = useState("0.2");
  const [contributionSchedule, setContributionSchedule] = useState("No contributions; same starting capital");
  const values = [{ label: "Strategy scenario", value: Number(strategy), tone: "text-cyan-100" }, { label: "BTC buy-and-hold", value: Number(btc), tone: "text-amber-100" }, { label: "Cash scenario", value: Number(cash), tone: "text-zinc-300" }, { label: "Periodic BTC scenario", value: Number(periodic), tone: "text-violet-100" }, { label: "Custom benchmark", value: Number(customBenchmark), tone: "text-fuchsia-100" }];
  const selected = values.find((item) => item.label === benchmark)?.value ?? 0;
  const rawNumericValues = [strategy, btc, cash, periodic, customBenchmark, costs];
  const numericValues = rawNumericValues.map(Number);
  const valid = rawNumericValues.every(hasFiniteInput) && numericValues.every(Number.isFinite) && numericValues[5] >= 0 && Boolean(startDate && endDate && startDate <= endDate && contributionSchedule.trim());
  return <LabFrame title="Benchmark lab" description="Use identical dates, cash flows, and costs before interpreting a comparison. These are user-entered scenario assumptions, not market forecasts." icon={GitCompareArrows}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6"><Field label="Active strategy" value={strategy} onChange={setStrategy} step="0.1" /><Field label="BTC buy-and-hold" value={btc} onChange={setBtc} step="0.1" /><Field label="Cash scenario" value={cash} onChange={setCash} step="0.1" /><Field label="Periodic BTC" value={periodic} onChange={setPeriodic} step="0.1" /><Field label="Custom benchmark" value={customBenchmark} onChange={setCustomBenchmark} step="0.1" /><label className="block text-xs text-zinc-400">Comparison focus<select value={benchmark} onChange={(event) => setBenchmark(event.target.value)} className="mt-2 h-10 w-full rounded-[0.7rem] border border-white/10 bg-[#0c1213] px-3 text-sm text-white outline-none focus:border-cyan-200/30"><option>BTC buy-and-hold</option><option>Cash scenario</option><option>Periodic BTC scenario</option><option>Custom benchmark</option></select></label></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><TextInput label="Shared start date" type="date" value={startDate} onChange={setStartDate} /><TextInput label="Shared end date" type="date" value={endDate} onChange={setEndDate} /><Field label="Shared costs (%)" value={costs} onChange={setCosts} min={0} step="0.05" /><TextInput label="Contribution schedule" value={contributionSchedule} onChange={setContributionSchedule} placeholder="Same start, monthly additions, or none" /></div>{valid ? <><div className="mt-6 space-y-4">{values.map((item) => <div key={item.label} className="grid grid-cols-[9rem_1fr_4rem] items-center gap-3 text-xs"><span className="truncate text-zinc-300">{item.label}</span><div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className={`h-full rounded-full ${item.label === benchmark ? "bg-cyan-200" : "bg-white/25"}`} style={{ width: `${Math.min(100, Math.max(3, Math.abs(item.value) * 2))}%` }} /></div><span className={`text-right font-mono ${item.tone}`}>{item.value.toFixed(1)}%</span></div>)}</div><p className="mt-6 rounded-[0.8rem] bg-amber-200/[0.04] p-3 text-xs leading-5 text-zinc-300">Focus: {benchmark} at {selected.toFixed(1)}%. Window <span className="font-mono text-zinc-300">{startDate} → {endDate}</span> · shared costs <span className="font-mono text-zinc-300">{costs}%</span> · contributions: <span className="font-mono text-zinc-300">{contributionSchedule}</span>. These values are entered scenarios; the lab does not calculate historical returns.</p></> : <ValidationMessage>Enter finite scenario values, non-negative shared costs, an ordered date window, and a contribution schedule.</ValidationMessage>}</LabFrame>;
}

export function EducationLabsWorkspace() {
  const [activeLab, setActiveLab] = useState<LabId>("position");
  const searchParams = useSearchParams();
  const monitorMarket = searchParams.get("market");
  const monitorState = searchParams.get("state");
  const monitorTimeframe = searchParams.get("timeframe");
  const monitorCapturedAt = searchParams.get("capturedAt");
  const capturedDate = monitorCapturedAt ? new Date(monitorCapturedAt) : null;
  const capturedLabel = capturedDate && !Number.isNaN(capturedDate.getTime()) ? capturedDate.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "timestamp not supplied";
  return <div className="space-y-6"><section className="workspace-hero section-shell relative overflow-hidden rounded-[1.25rem] p-6 sm:p-8"><div className="workspace-hero-glow" aria-hidden="true" /><div className="relative max-w-3xl"><div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-cyan-100/80"><FlaskConical className="size-4" aria-hidden="true" />Practice laboratories</div><h1 className="type-display mt-5 text-4xl text-white sm:text-5xl">Make the assumptions visible.</h1><p className="mt-4 text-sm leading-6 text-zinc-400">Six small laboratories turn common finance concepts into inspectable arithmetic and explainable mechanics. Nothing here submits an order or predicts a return.</p></div></section>{monitorMarket ? <div className="rounded-[1.05rem] border border-cyan-200/15 bg-cyan-200/[0.035] p-5"><p className="text-xs uppercase tracking-[0.14em] text-cyan-100/70">Market monitor context attached</p><p className="mt-2 text-sm text-white">{monitorMarket} · {monitorState ?? "descriptive"} · {monitorTimeframe ?? "selected timeframe"}</p><p className="mt-2 text-xs leading-5 text-zinc-300">Captured {capturedLabel}. The lab keeps this context visible for study, but all calculations remain your explicit inputs and do not become a signal or recommendation.</p></div> : null}<div className="flex gap-2 overflow-x-auto pb-1" aria-label="Education laboratories">{labs.map((lab) => <button key={lab.id} type="button" aria-pressed={activeLab === lab.id} onClick={() => setActiveLab(lab.id)} className={`shrink-0 rounded-[0.8rem] border px-3 py-2 text-left text-xs transition ${activeLab === lab.id ? "border-cyan-200/25 bg-cyan-200/[0.08] text-cyan-50" : "border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:bg-white/[0.05]"}`}><span className="block font-medium">{lab.label}</span><span className="mt-1 block text-[0.65rem] text-zinc-300">{lab.description}</span></button>)}</div>{activeLab === "position" ? <PositionSizeLab /> : activeLab === "expectancy" ? <ExpectancyLab /> : activeLab === "drawdown" ? <DrawdownLab /> : activeLab === "supertrend" ? <SupertrendLab /> : activeLab === "integrity" ? <BacktestIntegrityLab /> : <BenchmarkLab />}<div className="flex items-start gap-3 rounded-[0.95rem] border border-white/[0.07] bg-black/15 p-4 text-xs leading-5 text-zinc-300"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-cyan-100/60" aria-hidden="true" />Lab outputs are educational calculations from your inputs. They do not establish suitability, expected returns, or a live trading instruction.</div></div>;
}
