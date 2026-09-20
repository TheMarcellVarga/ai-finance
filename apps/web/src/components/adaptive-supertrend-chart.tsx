"use client";

import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  CrosshairMode,
  LineSeries,
  LineStyle,
  type CandlestickData,
  type LineData,
  type SeriesMarker,
  type UTCTimestamp,
  type WhitespaceData,
} from "lightweight-charts";
import { useEffect, useMemo, useRef } from "react";

import type { CryptoCandle } from "@/lib/crypto-supertrend";
import type { CryptoRateDecision } from "@/lib/crypto-chart";
import { calculateSimpleMovingAverage, type AdaptiveSupertrendResult } from "@/lib/adaptive-supertrend";

const DEFAULT_VISIBLE_CANDLES = 60;
const CHART_HEIGHT = 320;

type AdaptiveSupertrendChartProps = {
  baseAsset: string;
  candles: CryptoCandle[];
  result: AdaptiveSupertrendResult;
  rateDecisions?: CryptoRateDecision[];
};

function toChartTime(milliseconds: number) {
  return Math.floor(milliseconds / 1_000) as UTCTimestamp;
}

function buildTrendLine(
  result: AdaptiveSupertrendResult,
  trend: 1 | -1,
): Array<LineData<UTCTimestamp> | WhitespaceData<UTCTimestamp>> {
  return result.points.map((point) => (
    point.trend === trend
      ? { time: toChartTime(point.openTime), value: trend === 1 ? point.upper : point.lower }
      : { time: toChartTime(point.openTime) }
  ));
}

function formatPrice(value: number | null) {
  if (value == null) return "-";
  const digits = value >= 1_000 ? 2 : value >= 1 ? 4 : value >= 0.01 ? 6 : 8;
  return value.toFixed(digits);
}

export function AdaptiveSupertrendChart({ baseAsset, candles, result, rateDecisions = [] }: AdaptiveSupertrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fillSvgRef = useRef<SVGSVGElement>(null);
  const bullishFillRef = useRef<SVGPathElement>(null);
  const bearishFillRef = useRef<SVGPathElement>(null);
  const flipLabelRef = useRef<HTMLDivElement>(null);
  const candleData = useMemo<CandlestickData<UTCTimestamp>[]>(
    () => candles.map((candle) => ({
      time: toChartTime(candle.openTime),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    })),
    [candles],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || candleData.length === 0) {
      return;
    }

    const chart = createChart(container, {
      width: container.clientWidth,
      height: CHART_HEIGHT,
      layout: {
        background: { color: "#0a1011" },
        textColor: "#6f7f82",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 10,
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.035)" },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      crosshair: {
        mode: CrosshairMode.MagnetOHLC,
        vertLine: { color: "rgba(103,232,249,0.38)", width: 1, style: LineStyle.Dotted },
        horzLine: { color: "rgba(103,232,249,0.28)", width: 1, style: LineStyle.Dotted },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.12, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 3,
      },
      handleScroll: { vertTouchDrag: false },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderUpColor: "#26a69a",
      borderDownColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      priceLineVisible: false,
      lastValueVisible: true,
    });
    candleSeries.setData(candleData);

    const movingAverages = [
      { period: 50, color: "#67e8f9" },
      { period: 100, color: "#fbbf24" },
      { period: 200, color: "#e879f9" },
    ] as const;
    for (const movingAverage of movingAverages) {
      const series = chart.addSeries(LineSeries, {
        color: movingAverage.color,
        lineWidth: 1,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      series.setData(calculateSimpleMovingAverage(candles, movingAverage.period).map((point) => (
        point.value == null
          ? { time: toChartTime(point.openTime) }
          : { time: toChartTime(point.openTime), value: point.value }
      )));
    }

    const bullishSeries = chart.addSeries(LineSeries, {
      color: "#4caf50",
      lineWidth: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    bullishSeries.setData(buildTrendLine(result, 1));

    const bearishSeries = chart.addSeries(LineSeries, {
      color: "#f23645",
      lineWidth: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    bearishSeries.setData(buildTrendLine(result, -1));

    const markers: SeriesMarker<UTCTimestamp>[] = [];
    for (const point of result.points) {
      const time = toChartTime(point.openTime);
      if (point.buySignal) {
        markers.push({ time, position: "atPriceMiddle", price: point.upper, shape: "circle", color: "#4caf50", size: 1 });
        markers.push({ time, position: "belowBar", shape: "arrowUp", color: "#4caf50", text: "Long 5", size: 1 });
      }
      else if (point.sellSignal) {
        markers.push({ time, position: "atPriceMiddle", price: point.lower, shape: "circle", color: "#f23645", size: 1 });
        markers.push({ time, position: "aboveBar", shape: "arrowDown", color: "#f23645", text: "Short 3", size: 1 });
      }
    }
    for (const decision of rateDecisions) {
      if (decision.timestamp < candles[0].openTime) continue;
      const candle = candles.find((candidate) => candidate.openTime >= decision.timestamp);
      if (!candle) continue;
      markers.push({
        time: toChartTime(candle.openTime),
        position: "aboveBar",
        shape: "circle",
        color: decision.direction === "cut" ? "#a3e635" : "#fb7185",
        text: `${decision.direction === "cut" ? "CUT" : "HIKE"} ${decision.rate.toFixed(2)}%`,
        size: 1,
      });
    }
    markers.sort((left, right) => Number(left.time) - Number(right.time));
    createSeriesMarkers(candleSeries, markers, { autoScale: true });

    candleSeries.createPriceLine({
      price: result.nextFlipLevel,
      color: result.trend === 1 ? "#4caf50" : "#f23645",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `${baseAsset} flip`,
    });

    const candleByOpenTime = new Map(candles.map((candle) => [candle.openTime, candle]));
    const buildFillPath = (trend: 1 | -1) => {
      const paths: string[] = [];
      let segment: Array<{ x: number; top: number; bottom: number }> = [];

      const flushSegment = () => {
        if (segment.length > 1) {
          const top = segment.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.top}`).join(" ");
          const bottom = [...segment].reverse().map((point) => `L ${point.x} ${point.bottom}`).join(" ");
          paths.push(`${top} ${bottom} Z`);
        }
        segment = [];
      };

      for (const point of result.points) {
        if (point.trend !== trend) {
          flushSegment();
          continue;
        }

        const candle = candleByOpenTime.get(point.openTime);
        const x = chart.timeScale().timeToCoordinate(toChartTime(point.openTime));
        const top = candleSeries.priceToCoordinate(trend === 1 ? point.upper : point.lower);
        const bottom = candleSeries.priceToCoordinate(candle ? (candle.open + candle.high + candle.low + candle.close) / 4 : point.close);
        if (x == null || top == null || bottom == null) {
          flushSegment();
          continue;
        }
        segment.push({ x, top, bottom });
      }
      flushSegment();
      return paths.join(" ");
    };

    const updateOverlays = () => {
      fillSvgRef.current?.setAttribute("viewBox", `0 0 ${Math.max(1, container.clientWidth)} ${CHART_HEIGHT}`);
      bullishFillRef.current?.setAttribute("d", buildFillPath(1));
      bearishFillRef.current?.setAttribute("d", buildFillPath(-1));
      const flipY = candleSeries.priceToCoordinate(result.nextFlipLevel);
      if (flipLabelRef.current && flipY != null) {
        flipLabelRef.current.style.top = `${Math.max(4, Math.min(CHART_HEIGHT - 22, flipY - 11))}px`;
      }
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(updateOverlays);
    chart.timeScale().subscribeSizeChange(updateOverlays);
    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, candleData.length - DEFAULT_VISIBLE_CANDLES),
      to: candleData.length + 2,
    });
    updateOverlays();
    const overlayFrame = window.requestAnimationFrame(updateOverlays);
    const resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) {
        chart.applyOptions({ width });
        updateOverlays();
      }
    });
    resizeObserver.observe(container);

    return () => {
      window.cancelAnimationFrame(overlayFrame);
      resizeObserver.disconnect();
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(updateOverlays);
      chart.timeScale().unsubscribeSizeChange(updateOverlays);
      chart.remove();
    };
  }, [baseAsset, candleData, candles, rateDecisions, result]);

  return (
    <div ref={containerRef} className="relative h-[20rem] w-full overflow-hidden" role="img" aria-label={`${baseAsset} Adaptive Supertrend candlestick chart`}>
      <div className="pointer-events-none absolute left-3 top-2 z-10 flex gap-2 font-mono text-[0.52rem] uppercase tracking-[0.08em]" aria-hidden="true">
        <span className="text-cyan-300">SMA 50</span>
        <span className="text-amber-300">SMA 100</span>
        <span className="text-fuchsia-300">SMA 200</span>
      </div>
      <svg ref={fillSvgRef} className="pointer-events-none absolute inset-0 z-[3] size-full" preserveAspectRatio="none" aria-hidden="true">
        <path ref={bullishFillRef} fill="rgba(76,175,80,0.15)" />
        <path ref={bearishFillRef} fill="rgba(242,54,69,0.15)" />
      </svg>
      <div
        ref={flipLabelRef}
        className={`pointer-events-none absolute right-9 z-10 whitespace-nowrap text-[0.5rem] leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,.95)] ${result.trend === 1 ? "text-green-400" : "text-red-400"}`}
      >
        <span>Flip Level: {formatPrice(result.nextFlipLevel)}</span>
        <br />
        <span>{result.trend === 1 ? "BULLISH" : "BEARISH"}</span>
      </div>
    </div>
  );
}
