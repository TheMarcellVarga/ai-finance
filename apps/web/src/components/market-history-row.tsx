"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { MarketMonitorRow } from "@/lib/finance-api";

type Props = { row: MarketMonitorRow; children: ReactNode; className?: string; tabIndex?: number; dataUniversalMarket?: string };

export function MarketHistoryRow({ row, children, className, tabIndex, dataUniversalMarket }: Props) {
  const anchor = useRef<HTMLTableRowElement>(null);
  const cursor = useRef<{ x: number; y: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  const open = () => {
    clear();
    timer.current = setTimeout(() => {
      const rect = anchor.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(440, window.innerWidth - 24);
      setPosition({ width, left: Math.max(12, Math.min(cursor.current ? cursor.current.x + 16 : rect.left, window.innerWidth - width - 12)), top: Math.max(12, Math.min((cursor.current?.y ?? rect.bottom) + 12, window.innerHeight - 250)) });
    }, 300);
  };
  const close = () => { clear(); setPosition(null); };
  useEffect(() => {
    const dismiss = () => setPosition(null);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => { if (timer.current) clearTimeout(timer.current); window.removeEventListener("scroll", dismiss, true); window.removeEventListener("resize", dismiss); };
  }, []);
  const points = row.sparkline.filter((point) => Number.isFinite(point.value));
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const path = points.map((point, index) => `${(index / Math.max(points.length - 1, 1)) * 400},${130 - ((point.value - min) / span) * 120}`).join(" ");
  return <>
    <tr ref={anchor} className={className} tabIndex={tabIndex} data-universal-market={dataUniversalMarket} onMouseEnter={open} onMouseMove={(event) => { cursor.current = { x: event.clientX, y: event.clientY }; }} onMouseLeave={close} onFocus={() => { cursor.current = null; open(); }} onBlur={close} title="Hover to preview recent history">{children}</tr>
    {position ? createPortal(<aside role="tooltip" className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150 pointer-events-none fixed z-[90] rounded-xl border border-cyan-100/15 bg-[#081011] p-4 text-xs text-zinc-300 shadow-xl" style={position}>
      <p className="font-mono text-sm text-white">{row.symbol} · {row.displayValue}</p>
      <p className="mt-1">Recent provider history · {row.provider}</p>
      {points.length > 1 ? <><svg viewBox="0 0 400 140" className="mt-3 h-32 w-full" role="img" aria-label={`${row.symbol} recent price history`} preserveAspectRatio="none"><polyline points={path} fill="none" stroke="#a5f3fc" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg><div className="mt-1 flex justify-between gap-3 text-zinc-400"><span>{points[0].timestamp.slice(0, 10)}</span><span>{points[points.length - 1].timestamp.slice(0, 10)}</span></div></> : <p className="py-12 text-center">Price history is unavailable.</p>}
      <p className="mt-3 text-zinc-400">Captured {row.capturedAt ? new Date(row.capturedAt).toLocaleString() : "time unavailable"} · {row.isProxy ? "Proxy · " : ""}Recent history may use a different interval from the selected signal. Not financial advice.</p>
    </aside>, document.body) : null}
  </>;
}
