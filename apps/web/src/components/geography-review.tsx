"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { geographyThemeCopy, rankGeographyLocally, validateGeographyRanking, type GeographyReviewInput, type GeographyTheme } from "@/lib/ai/geography-review";

const endpoint = "/api/ai/geography-review";
const modeButtonClass = "min-w-18 rounded-md font-medium text-zinc-400 hover:bg-white/5 aria-pressed:bg-cyan-200/10 aria-pressed:text-cyan-50 aria-pressed:hover:bg-cyan-200/15";

type ReviewProps = {
  counts: GeographyReviewInput;
  breakdownId: string;
  capturedAt?: string;
};

export function GeographyReview(props: ReviewProps) {
  const [mode, setMode] = useState<"algo" | "ai">("algo");
  const [openedAi, setOpenedAi] = useState(false);
  const { counts, capturedAt, breakdownId } = props;
  const algoOrder = rankGeographyLocally(counts);

  return (
    <details className="group border-t border-white/[0.07] open:bg-white/[0.018]">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 text-sm font-medium text-zinc-200 hover:bg-white/[0.025] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-7 [&::-webkit-details-marker]:hidden">
        Geography research
        <ChevronDown className="size-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </summary>
      <div className="px-5 pb-5 sm:px-7">
        <div className="grid min-w-0 gap-5 pt-2 md:grid-cols-[minmax(12rem,0.65fr)_minmax(0,1.35fr)] md:gap-8">
          <div>
            <div className="inline-flex gap-1 rounded-lg border border-white/10 bg-background p-1" role="group" aria-label="Geography research mode">
              <Button type="button" variant="ghost" size="lg" aria-pressed={mode === "algo"} className={modeButtonClass} onClick={() => setMode("algo")}>Algo</Button>
              <Button type="button" variant="ghost" size="lg" aria-pressed={mode === "ai"} className={modeButtonClass} onClick={() => { setOpenedAi(true); setMode("ai"); }}>AI</Button>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-400">
              {mode === "algo"
                ? "Ranks topics by asset count in your browser. Uses no AI allowance."
                : "Ranks topics from three aggregate counts. Each run uses your AI research allowance."}
            </p>
          </div>
          <div className="min-w-0">
            {mode === "algo" ? <ThemeList order={algoOrder} counts={counts} title="Ranked by asset count" /> : null}
            {openedAi ? <LiveReview key={JSON.stringify(counts)} counts={counts} active={mode === "ai"} /> : null}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-white/[0.07] pt-3 text-xs leading-5 text-zinc-400">
          <a href={`#${breakdownId}`} className="text-cyan-100 underline decoration-cyan-200/30 underline-offset-4 hover:decoration-cyan-200">Source: geography breakdown</a>
          {capturedAt ? <span>Latest snapshot <time className="whitespace-nowrap" dateTime={capturedAt}>{capturedAt.replace("T", " ").slice(0, 16)} UTC</time></span> : <span>Snapshot time unavailable</span>}
        </div>
      </div>
    </details>
  );
}

function ThemeList({ order, counts, title }: { order: GeographyTheme[]; counts: GeographyReviewInput; title: string }) {
  if (!order.length) return <p className="border-y border-white/[0.07] py-5 text-sm text-zinc-400">No geography topics in this view.</p>;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-2">
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        <span className="text-xs text-zinc-400">Assets</span>
      </div>
      <ol role="list" className="divide-y divide-white/[0.07]">
        {order.map((theme, index) => (
          <li key={theme} className="grid grid-cols-[1rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-3">
            <span aria-hidden="true" className="font-mono text-xs tabular-nums text-zinc-400">{index + 1}</span>
            <div>
              <p className="text-sm font-medium text-zinc-100">{geographyThemeCopy[theme].title}</p>
              <p className="mt-0.5 text-xs leading-5 text-zinc-400">{geographyThemeCopy[theme].context}</p>
            </div>
            <span className="text-right font-mono text-sm tabular-nums text-cyan-100">{counts[theme]}<span className="sr-only"> assets</span></span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function LiveReview({ counts, active }: { counts: GeographyReviewInput; active: boolean }) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [order, setOrder] = useState<GeographyTheme[]>([]);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!active || available !== null) return;
    const controller = new AbortController();
    void fetch(endpoint, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = response.ok ? await response.json() : null;
        if (!controller.signal.aborted) setAvailable(data?.enabled === true);
      })
      .catch(() => { if (!controller.signal.aborted) setAvailable(false); });
    return () => controller.abort();
  }, [active, available]);

  useEffect(() => () => request.current?.abort(), []);

  async function generate() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setStatus("Ranking topics…");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(counts),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null);
      if (controller.signal.aborted) return;
      if (!response.ok) {
        setStatus(typeof result?.error?.message === "string" ? result.error.message : "AI review unavailable. Try again or use Algo.");
        return;
      }
      const ranking = validateGeographyRanking(counts, { order: result?.order });
      setOrder(ranking);
      setStatus(result.saved ? "AI ranking ready." : "AI ranking ready. Saving the review was unavailable.");
    } catch {
      if (!controller.signal.aborted) setStatus("AI review unavailable. Try again or use Algo.");
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }

  const eligible = rankGeographyLocally(counts).length >= 2;
  return (
    <div hidden={!active}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {available === null ? <p role="status" className="py-2 text-sm text-zinc-400">Checking AI availability…</p> : null}
        {available === false ? <p role="status" className="border-y border-white/[0.07] py-4 text-sm text-zinc-300">AI is unavailable. Algo is ready to use.</p> : null}
        {available && !eligible ? <p className="border-y border-white/[0.07] py-4 text-sm text-zinc-400">AI needs at least two topics with assets to compare.</p> : null}
        {available && eligible ? (
          <Button type="button" variant="outline" size="lg" aria-disabled={pending} className="aria-disabled:opacity-70" onClick={() => void generate()}>
            {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : null}
            {pending ? "Ranking…" : order.length ? "Rank again" : "Rank with AI"}
          </Button>
        ) : null}
        <p role="status" className={pending || status === "AI ranking ready." || !status ? "sr-only" : "text-sm leading-5 text-zinc-300"}>{status}</p>
      </div>
      {order.length ? <div className="mt-4"><ThemeList order={order} counts={counts} title="Latest AI ranking" /></div> : null}
    </div>
  );
}
