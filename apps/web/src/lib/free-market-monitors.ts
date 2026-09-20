import type { MarketMonitorPoint, MarketMonitorResponse, MarketMonitorRow } from "@/lib/finance-api";
import type { CryptoCandle } from "@/lib/crypto-supertrend";
import type { CryptoMonitorInterval } from "@/lib/crypto-monitor-intervals";
import { calculateAdaptiveSupertrendAuto } from "@/lib/adaptive-supertrend";

type DirectInstrument = {
  symbol: string;
  name: string;
  currency: string;
  unit?: string;
  format?: "rate" | "percent";
  isProxy?: boolean;
  proxyNote?: string;
};

type DirectMonitorDefinition = {
  id: string;
  label: string;
  description: string;
  coverage: string;
  quoteConvention: string;
  provider: "yahoo" | "frankfurter";
  providerLabel: string;
  instruments: DirectInstrument[];
};

const directMonitorDefinitions: DirectMonitorDefinition[] = [
  {
    id: "equities",
    label: "Equities",
    description: "Listed ownership across major developed and emerging markets.",
    coverage: "Global listed equity sample",
    quoteConvention: "Provider-listed local or converted quote currency",
    provider: "yahoo",
    providerLabel: "Yahoo Finance chart data",
    instruments: [
      { symbol: "AAPL", name: "Apple", currency: "USD" },
      { symbol: "MSFT", name: "Microsoft", currency: "USD" },
      { symbol: "NVDA", name: "NVIDIA", currency: "USD" },
      { symbol: "TSM", name: "Taiwan Semiconductor", currency: "USD" },
      { symbol: "ASML", name: "ASML Holding", currency: "USD" },
      { symbol: "SAP", name: "SAP", currency: "USD" },
      { symbol: "7203.T", name: "Toyota Motor", currency: "JPY" },
      { symbol: "0700.HK", name: "Tencent Holdings", currency: "HKD" },
      { symbol: "RELIANCE.NS", name: "Reliance Industries", currency: "INR" },
    ],
  },
  {
    id: "funds",
    label: "Funds & indexes",
    description: "ETFs and broad index vehicles for diversified market exposure.",
    coverage: "Listed ETF and index sample",
    quoteConvention: "Listed fund or index quote in the provider currency",
    provider: "yahoo",
    providerLabel: "Yahoo Finance chart data",
    instruments: [
      { symbol: "VT", name: "Vanguard Total World Stock ETF", currency: "USD" },
      { symbol: "VTI", name: "Vanguard Total Stock Market ETF", currency: "USD" },
      { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", currency: "USD" },
      { symbol: "QQQ", name: "Invesco QQQ Trust", currency: "USD" },
      { symbol: "EFA", name: "iShares MSCI EAFE ETF", currency: "USD" },
      { symbol: "IEMG", name: "iShares Core MSCI Emerging Markets ETF", currency: "USD" },
      { symbol: "SCHD", name: "Schwab US Dividend Equity ETF", currency: "USD" },
      { symbol: "BND", name: "Vanguard Total Bond Market ETF", currency: "USD" },
    ],
  },
  {
    id: "fixed-income",
    label: "Fixed income",
    description: "Listed bond funds and sovereign-duration references across the rate curve.",
    coverage: "Listed bond and sovereign proxy sample",
    quoteConvention: "Listed fund price; yield and spread data are not inferred",
    provider: "yahoo",
    providerLabel: "Yahoo Finance chart data",
    instruments: [
      { symbol: "SHY", name: "iShares 1-3 Year Treasury Bond ETF", currency: "USD", isProxy: true, proxyNote: "Listed Treasury proxy" },
      { symbol: "IEF", name: "iShares 7-10 Year Treasury Bond ETF", currency: "USD", isProxy: true, proxyNote: "Listed Treasury proxy" },
      { symbol: "TLT", name: "iShares 20+ Year Treasury Bond ETF", currency: "USD", isProxy: true, proxyNote: "Listed Treasury proxy" },
      { symbol: "AGG", name: "iShares Core U.S. Aggregate Bond ETF", currency: "USD", isProxy: true, proxyNote: "Listed aggregate-bond proxy" },
      { symbol: "LQD", name: "iShares iBoxx Investment Grade Corporate Bond ETF", currency: "USD", isProxy: true, proxyNote: "Listed corporate-bond proxy" },
      { symbol: "HYG", name: "iShares iBoxx High Yield Corporate Bond ETF", currency: "USD", isProxy: true, proxyNote: "Listed high-yield proxy" },
      { symbol: "EMB", name: "iShares J.P. Morgan USD Emerging Markets Bond ETF", currency: "USD", isProxy: true, proxyNote: "Listed emerging-market debt proxy" },
      { symbol: "IGOV", name: "iShares International Treasury Bond ETF", currency: "USD", isProxy: true, proxyNote: "Listed sovereign-bond proxy" },
    ],
  },
  {
    id: "currencies",
    label: "Currencies",
    description: "Daily central-bank reference rates for major and regional currency pairs.",
    coverage: "98 central-bank sources and 205 currencies via Frankfurter",
    quoteConvention: "1 USD = quoted currency units; daily reference rates",
    provider: "frankfurter",
    providerLabel: "Frankfurter / ECB reference rates",
    instruments: [
      { symbol: "USD/EUR", name: "US dollar / euro", unit: "EUR per USD", currency: "EUR", format: "rate" },
      { symbol: "USD/GBP", name: "US dollar / pound sterling", unit: "GBP per USD", currency: "GBP", format: "rate" },
      { symbol: "USD/JPY", name: "US dollar / Japanese yen", unit: "JPY per USD", currency: "JPY", format: "rate" },
      { symbol: "USD/CHF", name: "US dollar / Swiss franc", unit: "CHF per USD", currency: "CHF", format: "rate" },
      { symbol: "USD/CNY", name: "US dollar / Chinese yuan", unit: "CNY per USD", currency: "CNY", format: "rate" },
      { symbol: "USD/SGD", name: "US dollar / Singapore dollar", unit: "SGD per USD", currency: "SGD", format: "rate" },
      { symbol: "USD/HKD", name: "US dollar / Hong Kong dollar", unit: "HKD per USD", currency: "HKD", format: "rate" },
      { symbol: "USD/AUD", name: "US dollar / Australian dollar", unit: "AUD per USD", currency: "AUD", format: "rate" },
      { symbol: "USD/CAD", name: "US dollar / Canadian dollar", unit: "CAD per USD", currency: "CAD", format: "rate" },
      { symbol: "USD/INR", name: "US dollar / Indian rupee", unit: "INR per USD", currency: "INR", format: "rate" },
    ],
  },
  {
    id: "commodities",
    label: "Commodities",
    description: "Energy, metals, and agricultural futures used as public reference prices.",
    coverage: "Exchange-traded futures reference sample",
    quoteConvention: "Front contract public quote; contract roll is not normalized",
    provider: "yahoo",
    providerLabel: "Yahoo Finance chart data",
    instruments: [
      { symbol: "GC=F", name: "Gold futures", unit: "USD / troy oz", currency: "USD" },
      { symbol: "SI=F", name: "Silver futures", unit: "USD / troy oz", currency: "USD" },
      { symbol: "CL=F", name: "WTI crude oil futures", unit: "USD / barrel", currency: "USD" },
      { symbol: "NG=F", name: "Natural gas futures", unit: "USD / MMBtu", currency: "USD" },
      { symbol: "HG=F", name: "Copper futures", unit: "USD / lb", currency: "USD" },
      { symbol: "ZC=F", name: "Corn futures", unit: "US cents / bushel", currency: "USD" },
      { symbol: "ZW=F", name: "Wheat futures", unit: "US cents / bushel", currency: "USD" },
      { symbol: "KC=F", name: "Coffee futures", unit: "US cents / lb", currency: "USD" },
    ],
  },
  {
    id: "real-estate",
    label: "Real estate",
    description: "Listed REITs and property funds that make the public market slice visible.",
    coverage: "Listed REIT and property-fund proxy sample",
    quoteConvention: "Listed REIT or property-fund quote; private property is not marked",
    provider: "yahoo",
    providerLabel: "Yahoo Finance chart data",
    instruments: [
      { symbol: "VNQ", name: "Vanguard Real Estate ETF", currency: "USD", isProxy: true, proxyNote: "Listed REIT proxy" },
      { symbol: "VNQI", name: "Vanguard Global ex-U.S. Real Estate ETF", currency: "USD", isProxy: true, proxyNote: "Listed global property proxy" },
      { symbol: "IYR", name: "iShares U.S. Real Estate ETF", currency: "USD", isProxy: true, proxyNote: "Listed property proxy" },
      { symbol: "XLRE", name: "Real Estate Select Sector SPDR Fund", currency: "USD", isProxy: true, proxyNote: "Listed REIT proxy" },
      { symbol: "SCHH", name: "Schwab U.S. REIT ETF", currency: "USD", isProxy: true, proxyNote: "Listed REIT proxy" },
      { symbol: "RWX", name: "SPDR Dow Jones International Real Estate ETF", currency: "USD", isProxy: true, proxyNote: "Listed global property proxy" },
      { symbol: "PLD", name: "Prologis", currency: "USD", isProxy: true, proxyNote: "Listed logistics property proxy" },
      { symbol: "WELL", name: "Welltower", currency: "USD", isProxy: true, proxyNote: "Listed healthcare property proxy" },
    ],
  },
  {
    id: "derivatives",
    label: "Derivatives",
    description: "Public futures references across equity indexes, rates, energy, and metals.",
    coverage: "Exchange-traded futures reference sample",
    quoteConvention: "Front contract public quote; open interest and options greeks are not included",
    provider: "yahoo",
    providerLabel: "Yahoo Finance chart data",
    instruments: [
      { symbol: "ES=F", name: "E-mini S&P 500 futures", unit: "index points", currency: "USD" },
      { symbol: "NQ=F", name: "E-mini Nasdaq-100 futures", unit: "index points", currency: "USD" },
      { symbol: "YM=F", name: "E-mini Dow futures", unit: "index points", currency: "USD" },
      { symbol: "RTY=F", name: "E-mini Russell 2000 futures", unit: "index points", currency: "USD" },
      { symbol: "ZN=F", name: "10-year Treasury note futures", unit: "points", currency: "USD" },
      { symbol: "ZB=F", name: "30-year Treasury bond futures", unit: "points", currency: "USD" },
      { symbol: "GC=F", name: "Gold futures", unit: "USD / troy oz", currency: "USD" },
      { symbol: "CL=F", name: "WTI crude oil futures", unit: "USD / barrel", currency: "USD" },
    ],
  },
  {
    id: "private-markets",
    label: "Private markets",
    description: "Listed access vehicles used as transparent public proxies for private-market themes.",
    coverage: "Listed private-equity, BDC, and private-credit proxies",
    quoteConvention: "Listed proxy price; private NAV, marks, and liquidity are not inferred",
    provider: "yahoo",
    providerLabel: "Yahoo Finance chart data",
    instruments: [
      { symbol: "PSP", name: "Invesco Global Listed Private Equity ETF", currency: "USD", isProxy: true, proxyNote: "Listed private-equity proxy" },
      { symbol: "PEX", name: "ProShares Global Listed Private Equity ETF", currency: "USD", isProxy: true, proxyNote: "Listed private-equity proxy" },
      { symbol: "BIZD", name: "VanEck BDC Income ETF", currency: "USD", isProxy: true, proxyNote: "Listed private-credit proxy" },
      { symbol: "ARCC", name: "Ares Capital", currency: "USD", isProxy: true, proxyNote: "Listed BDC proxy" },
      { symbol: "GBDC", name: "Golub Capital BDC", currency: "USD", isProxy: true, proxyNote: "Listed BDC proxy" },
      { symbol: "MAIN", name: "Main Street Capital", currency: "USD", isProxy: true, proxyNote: "Listed BDC proxy" },
    ],
  },
  {
    id: "cash-rates",
    label: "Cash & rates",
    description: "Short-term liquidity vehicles and Treasury curve references for cash context.",
    coverage: "U.S. Treasury curve and listed cash proxy sample",
    quoteConvention: "Yield-index level or listed fund price; not a deposit rate",
    provider: "yahoo",
    providerLabel: "Yahoo Finance chart data",
    instruments: [
      { symbol: "^IRX", name: "13-week Treasury bill yield", unit: "% yield", currency: "USD", format: "percent" },
      { symbol: "^FVX", name: "5-year Treasury yield", unit: "% yield", currency: "USD", format: "percent" },
      { symbol: "^TNX", name: "10-year Treasury yield", unit: "% yield", currency: "USD", format: "percent" },
      { symbol: "^TYX", name: "30-year Treasury yield", unit: "% yield", currency: "USD", format: "percent" },
      { symbol: "SGOV", name: "iShares 0-3 Month Treasury Bond ETF", currency: "USD", isProxy: true, proxyNote: "Listed cash-management proxy" },
      { symbol: "BIL", name: "SPDR Bloomberg 1-3 Month T-Bill ETF", currency: "USD", isProxy: true, proxyNote: "Listed cash-management proxy" },
      { symbol: "SHV", name: "iShares 0-1 Year Treasury ETF", currency: "USD", isProxy: true, proxyNote: "Listed cash-management proxy" },
    ],
  },
  {
    id: "protection",
    label: "Protection & contracts",
    description: "Listed insurance and income proxies for contract-based asset research.",
    coverage: "Listed insurance and preferred-income proxy sample",
    quoteConvention: "Listed proxy price; contract terms, guarantees, and liabilities are not inferred",
    provider: "yahoo",
    providerLabel: "Yahoo Finance chart data",
    instruments: [
      { symbol: "KIE", name: "SPDR S&P Insurance ETF", currency: "USD", isProxy: true, proxyNote: "Listed insurance proxy" },
      { symbol: "IAK", name: "iShares U.S. Insurance ETF", currency: "USD", isProxy: true, proxyNote: "Listed insurance proxy" },
      { symbol: "PFF", name: "iShares Preferred and Income Securities ETF", currency: "USD", isProxy: true, proxyNote: "Listed preferred-income proxy" },
      { symbol: "PGX", name: "Invesco Preferred ETF", currency: "USD", isProxy: true, proxyNote: "Listed preferred-income proxy" },
      { symbol: "TIP", name: "iShares TIPS Bond ETF", currency: "USD", isProxy: true, proxyNote: "Listed inflation-linked proxy" },
      { symbol: "LQD", name: "iShares iBoxx Investment Grade Corporate Bond ETF", currency: "USD", isProxy: true, proxyNote: "Listed income proxy" },
    ],
  },
];

type YahooChartPayload = {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string;
        exchangeName?: string;
        regularMarketPrice?: number | null;
        regularMarketTime?: number;
        chartPreviousClose?: number | null;
      };
      timestamp?: number[];
      indicators?: { quote?: Array<{
        open?: Array<number | null>;
        high?: Array<number | null>;
        low?: Array<number | null>;
        close?: Array<number | null>;
        volume?: Array<number | null>;
      }> };
    }>;
  };
};

type FrankfurterPayload = {
  rates?: Record<string, Record<string, number>>;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function percentChange(current: number, previous: number) {
  if (!isFiniteNumber(current) || !isFiniteNumber(previous) || previous === 0) return 0;
  return (current / previous - 1) * 100;
}

function referencePointAtOrBefore(points: MarketMonitorPoint[], timestampMs: number) {
  let match: MarketMonitorPoint | undefined;
  for (const point of points) {
    if (new Date(point.timestamp).getTime() > timestampMs) break;
    match = point;
  }
  return match;
}

function formatMonitorValue(value: number, format: DirectInstrument["format"], currency: string, unit?: string) {
  if (format === "percent") return `${value.toFixed(2)}%`;
  if (format === "rate") return `${value.toFixed(5)} ${unit ?? ""}`.trim();
  const prefix: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥", INR: "₹" };
  const symbol = prefix[currency] ?? `${currency} `;
  return unit ? `${symbol}${value.toFixed(4)} ${unit}` : `${symbol}${value.toFixed(2)}`;
}

const intervalMilliseconds: Record<CryptoMonitorInterval, number> = {
  "1m": 60_000,
  "3m": 180_000,
  "5m": 300_000,
  "15m": 900_000,
  "30m": 1_800_000,
  "1h": 3_600_000,
  "2h": 7_200_000,
  "4h": 14_400_000,
  "6h": 21_600_000,
  "12h": 43_200_000,
  "1d": 86_400_000,
  "3d": 259_200_000,
  "1w": 604_800_000,
};

function yahooIntervalConfig(interval: CryptoMonitorInterval) {
  if (interval === "1m" || interval === "3m") return { providerInterval: "1m", range: "5d", aggregate: interval === "3m" ? 3 : 1 };
  if (interval === "5m" || interval === "15m" || interval === "30m") return { providerInterval: interval, range: "60d", aggregate: 1 };
  if (["1h", "2h", "4h", "6h", "12h"].includes(interval)) return { providerInterval: "60m", range: "60d", aggregate: Number.parseInt(interval, 10) || 1 };
  if (interval === "3d") return { providerInterval: "1d", range: "5y", aggregate: 3 };
  if (interval === "1w") return { providerInterval: "1wk", range: "10y", aggregate: 1 };
  return { providerInterval: "1d", range: "5y", aggregate: 1 };
}

function aggregateCandles(candles: CryptoCandle[], size: number, interval: CryptoMonitorInterval) {
  if (size <= 1) return candles;
  const aggregated: CryptoCandle[] = [];
  for (let index = 0; index + size <= candles.length; index += size) {
    const group = candles.slice(index, index + size);
    aggregated.push({
      openTime: group[0].openTime,
      open: group[0].open,
      closeTime: group.at(-1)!.closeTime,
      high: Math.max(...group.map((candle) => candle.high)),
      low: Math.min(...group.map((candle) => candle.low)),
      close: group.at(-1)!.close,
    });
  }
  return aggregated.map((candle) => ({ ...candle, closeTime: candle.openTime + intervalMilliseconds[interval] - 1 }));
}

function withAdaptiveSupertrend(row: MarketMonitorRow, candles: CryptoCandle[], interval: CryptoMonitorInterval, signalBasis: "ohlc" | "close-derived") {
  try {
    const closedCandles = candles.length > 12 ? candles.slice(0, -1) : candles;
    const analysis = calculateAdaptiveSupertrendAuto(closedCandles);
    const result = analysis.result;
    return {
      ...row,
      trend: result.trend === 1 ? "bullish" as const : "bearish" as const,
      atrPeriod: analysis.atrPeriod,
      atrMultiplier: analysis.atrMultiplier,
      autoSelectionReady: analysis.auto.selectionReady,
      lastFlipAt: result.lastFlipTime == null ? null : new Date(result.lastFlipTime).toISOString(),
      nextFlipLevel: result.nextFlipLevel,
      distanceToFlipPercent: Math.abs((result.nextFlipLevel / result.close - 1) * 100),
      sinceFlipPercent: result.sinceFlipPercent,
      historyComplete: closedCandles.length >= 100,
      signalInterval: interval,
      signalBasis,
    } satisfies MarketMonitorRow;
  } catch (error) {
    return {
      ...row,
      signalInterval: interval,
      signalBasis,
      signalUnavailableReason: error instanceof Error ? error.message : "Adaptive Supertrend history is unavailable.",
    } satisfies MarketMonitorRow;
  }
}

async function fetchJson<T>(endpoint: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9_000);
  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json", "User-Agent": "ApertureFinancialIntelligence/0.1" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Public data source returned HTTP ${response.status}.`);
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Public data source request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchYahooInstrument(instrument: DirectInstrument, interval: CryptoMonitorInterval): Promise<MarketMonitorRow> {
  let lastError: unknown;
  const config = yahooIntervalConfig(interval);
  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const endpoint = `https://${host}/v8/finance/chart/${encodeURIComponent(instrument.symbol)}?range=${config.range}&interval=${config.providerInterval}&includePrePost=false`;
      const payload = await fetchJson<YahooChartPayload>(endpoint);
      const result = payload.chart?.result?.[0];
      const timestamps = result?.timestamp ?? [];
      const quote = result?.indicators?.quote?.[0];
      if (!result || !quote) throw new Error("Public chart had no quote series.");

      const points: MarketMonitorPoint[] = [];
      const candles: CryptoCandle[] = [];
      let latestVolume = 0;
      for (let index = 0; index < timestamps.length; index += 1) {
        const timestamp = timestamps[index];
        const value = quote.close?.[index];
        if (!isFiniteNumber(timestamp) || !isFiniteNumber(value)) continue;
        points.push({ timestamp: new Date(timestamp * 1000).toISOString(), value });
        const previousClose = candles.at(-1)?.close ?? value;
        const open = quote.open?.[index];
        const high = quote.high?.[index];
        const low = quote.low?.[index];
        const openValue = isFiniteNumber(open) ? open : previousClose;
        candles.push({
          openTime: timestamp * 1000,
          open: openValue,
          high: isFiniteNumber(high) ? high : Math.max(openValue, value),
          low: isFiniteNumber(low) ? low : Math.min(openValue, value),
          close: value,
          closeTime: timestamp * 1000 + intervalMilliseconds[interval] - 1,
        });
        const volume = quote.volume?.[index];
        if (isFiniteNumber(volume)) latestVolume = volume;
      }
      if (points.length < 2) throw new Error("Public chart had fewer than two usable closes.");

      const currentPoint = points[points.length - 1];
      const previousPoint = points[points.length - 2];
      const regularMarketPrice = result.meta?.regularMarketPrice;
      const current = isFiniteNumber(regularMarketPrice) && regularMarketPrice > 0 ? regularMarketPrice : currentPoint.value;
      const currentTimestamp = new Date(currentPoint.timestamp).getTime();
      const previousDayPoint = referencePointAtOrBefore(points, currentTimestamp - 86_400_000) ?? previousPoint;
      const trailingQuarterPoint = referencePointAtOrBefore(points, currentTimestamp - 90 * 86_400_000) ?? points[0];
      const marketTimestamp = result.meta?.regularMarketTime;
      const capturedAt = isFiniteNumber(marketTimestamp) && marketTimestamp > 0
        ? new Date(marketTimestamp * 1000).toISOString()
        : currentPoint.timestamp;

      const row: MarketMonitorRow = {
        symbol: instrument.symbol,
        name: instrument.name,
        venue: result.meta?.exchangeName,
        currency: result.meta?.currency || instrument.currency,
        unit: instrument.unit,
        price: current,
        displayValue: formatMonitorValue(current, instrument.format, result.meta?.currency || instrument.currency, instrument.unit),
        dailyChangePercent: percentChange(current, previousDayPoint.value),
        monthlyChangePercent: percentChange(current, trailingQuarterPoint.value),
        volume: latestVolume,
        sparkline: points.slice(-32),
        provider: "free-yahoo",
        sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(instrument.symbol)}`,
        capturedAt,
        isProxy: instrument.isProxy,
        proxyNote: instrument.proxyNote,
      };
      return withAdaptiveSupertrend(row, aggregateCandles(candles, config.aggregate, interval), interval, "ohlc");
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Public quote unavailable.");
}

async function loadYahoo(definition: DirectMonitorDefinition, interval: CryptoMonitorInterval) {
  const settled = await Promise.allSettled(definition.instruments.map((instrument) => fetchYahooInstrument(instrument, interval)));
  const rows: MarketMonitorRow[] = [];
  const failures: string[] = [];
  for (const [index, result] of settled.entries()) {
    if (result.status === "fulfilled") {
      rows.push(result.value);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : "Public quote unavailable.";
      failures.push(`${definition.instruments[index].symbol}: ${reason}`);
    }
  }
  const capturedAt = rows.reduce((latest, row) => row.capturedAt > latest ? row.capturedAt : latest, "");
  return { rows, capturedAt, failures };
}

async function loadFrankfurter(definition: DirectMonitorDefinition, interval: CryptoMonitorInterval) {
  const today = new Date();
  const endDate = today.toISOString().slice(0, 10);
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 730);
  const startDate = start.toISOString().slice(0, 10);
  const symbols = definition.instruments.map((instrument) => instrument.symbol.split("/")[1]).filter(Boolean).join(",");
  const endpoint = `https://api.frankfurter.dev/v1/${startDate}..${endDate}?base=USD&symbols=${encodeURIComponent(symbols)}`;
  const payload = await fetchJson<FrankfurterPayload>(endpoint);
  const dates = Object.keys(payload.rates ?? {}).sort();
  if (dates.length === 0) throw new Error("Frankfurter returned no daily observations.");
  const latestDate = dates[dates.length - 1];
  const previousDate = dates.length > 1 ? dates[dates.length - 2] : undefined;
  const latestRates = payload.rates?.[latestDate] ?? {};
  const capturedAt = `${latestDate}T23:59:59.000Z`;
  const rows: MarketMonitorRow[] = [];
  const failures: string[] = [];

  for (const instrument of definition.instruments) {
    const quote = instrument.symbol.split("/")[1];
    const value = latestRates[quote];
    if (!isFiniteNumber(value) || value <= 0) {
      failures.push(`${instrument.symbol}: reference rate unavailable`);
      continue;
    }
    const previous = previousDate ? payload.rates?.[previousDate]?.[quote] : undefined;
    const sparkline = dates.flatMap((date): MarketMonitorPoint[] => {
      const rate = payload.rates?.[date]?.[quote];
      return isFiniteNumber(rate) ? [{ timestamp: `${date}T00:00:00.000Z`, value: rate }] : [];
    });
    const pointsForSignal = sparkline.map((point, index) => {
      const previous = index > 0 ? sparkline[index - 1].value : point.value;
      return {
        openTime: new Date(point.timestamp).getTime(),
        open: previous,
        high: Math.max(previous, point.value),
        low: Math.min(previous, point.value),
        close: point.value,
        closeTime: new Date(point.timestamp).getTime() + 86_400_000 - 1,
      } satisfies CryptoCandle;
    });
    const row: MarketMonitorRow = {
      symbol: instrument.symbol,
      name: instrument.name,
      currency: instrument.currency,
      unit: instrument.unit,
      price: value,
      displayValue: formatMonitorValue(value, instrument.format, instrument.currency, instrument.unit),
      dailyChangePercent: isFiniteNumber(previous) ? percentChange(value, previous) : 0,
      monthlyChangePercent: sparkline.length > 0 ? percentChange(value, sparkline[0].value) : 0,
      sparkline: sparkline.slice(-32),
      provider: "free-frankfurter",
      sourceUrl: "https://frankfurter.dev/",
      capturedAt,
    };
    if (interval === "1d" || interval === "3d" || interval === "1w") {
      const size = interval === "3d" ? 3 : interval === "1w" ? 7 : 1;
      rows.push(withAdaptiveSupertrend(row, aggregateCandles(pointsForSignal, size, interval), interval, "close-derived"));
    } else {
      rows.push({ ...row, signalInterval: interval, signalBasis: "close-derived", signalUnavailableReason: "Intraday FX OHLC is unavailable from the configured reference-rate provider." });
    }
  }
  return { rows, capturedAt, failures };
}

function availableClasses() {
  return [
    ...directMonitorDefinitions.map((definition) => ({
      id: definition.id,
      label: definition.label,
      description: definition.description,
      coverage: definition.coverage,
    })),
    {
      id: "crypto",
      label: "Digital assets",
      description: "Dedicated public crypto monitor with exchange scope and Adaptive Supertrend history.",
      coverage: "OKX and supported public exchange spot markets",
    },
  ];
}

export async function loadDirectFreeAssetMonitor(assetClass: string, interval: CryptoMonitorInterval = "1d"): Promise<MarketMonitorResponse> {
  const definition = directMonitorDefinitions.find((item) => item.id === assetClass.trim().toLowerCase());
  if (!definition) throw new Error(`Unknown free asset-class monitor: ${assetClass}.`);
  const result = definition.provider === "frankfurter" ? await loadFrankfurter(definition, interval) : await loadYahoo(definition, interval);
  if (result.rows.length === 0) throw new Error("The free public market monitor returned no usable rows.");

  return {
    data: result.rows,
    meta: {
      assetClass: definition.id,
      label: definition.label,
      description: definition.description,
      provider: definition.provider,
      providerLabel: `${definition.providerLabel} · direct BFF fallback`,
      freeApi: true,
      capturedAt: result.capturedAt || new Date().toISOString(),
      requestedMarkets: definition.instruments.length,
      returnedMarkets: result.rows.length,
      failedMarkets: result.failures.length,
      coverage: definition.coverage,
      quoteConvention: definition.quoteConvention,
      freshness: "Public delayed or daily reference data; direct BFF fallback is active because the finance API was unavailable.",
      failureReasons: result.failures,
      interval,
      signalMarkets: result.rows.filter((row) => row.trend).length,
      availableClasses: availableClasses(),
    },
  };
}
