import "server-only";

import type { CryptoChartPayload } from "@/lib/crypto-chart";
import {
  CRYPTO_MONITOR_GLOBAL_SCOPE_LABEL,
  CRYPTO_MONITOR_SCOPE,
  CRYPTO_MONITOR_SCOPE_LABEL,
  getCcxtExchange,
  getCryptoExchangeCatalog,
  getCryptoExchangeLabel,
  normalizeCryptoMonitorScope,
  normalizeCryptoMonitorProvider,
  type CcxtMarket,
  type CcxtTicker,
  type CryptoMonitorScope,
  type CryptoMonitorProvider,
} from "@/lib/crypto-exchanges";
import { isFlipEligibleBaseAsset } from "@/lib/crypto-market-universe";
import { calculateSupertrend, type CryptoCandle } from "@/lib/crypto-supertrend";
import type { CryptoMonitorInterval } from "@/lib/crypto-monitor-intervals";

export { isStablecoinAsset } from "@/lib/crypto-market-universe";
export { cryptoMonitorIntervals, normalizeCryptoMonitorInterval } from "@/lib/crypto-monitor-intervals";
export {
  CRYPTO_MONITOR_GLOBAL_SCOPE,
  CRYPTO_MONITOR_GLOBAL_SCOPE_LABEL,
  CRYPTO_MONITOR_SCOPE,
  CRYPTO_MONITOR_SCOPE_LABEL,
  cryptoMonitorProviders,
  getCryptoExchangeCatalog,
  normalizeCryptoMonitorScope,
  normalizeCryptoMonitorProvider,
} from "@/lib/crypto-exchanges";
export type { CryptoMonitorInterval } from "@/lib/crypto-monitor-intervals";
export type { CryptoExchangeOption, CryptoMonitorProvider, CryptoMonitorScope } from "@/lib/crypto-exchanges";

const OKX_API_BASE = "https://www.okx.com";
const COINGECKO_API_BASE = "https://api.coingecko.com/api/v3";
const COINMARKETCAP_API_BASE = "https://pro-api.coinmarketcap.com/public-api/v1";
const COINMARKETCAP_COIN_BASE = "https://coinmarketcap.com/currencies";
const COINMARKETCAP_SEARCH_BASE = "https://coinmarketcap.com/coins/?q=";
const COINCAP_ICON_BASE = "https://assets.coincap.io/assets/icons";
const DEFAULT_LIMIT = 80;
const MAX_LIMIT = 150;
const OKX_KLINE_PAGE_LIMIT = 300;
const MAX_KLINE_HISTORY_PAGES = 8;
const CHART_CANDLE_LIMIT = 180;
const CCXT_KLINE_PAGE_LIMIT = 500;
const ATR_PERIOD = 10;
const ATR_MULTIPLIER = 3;
const CCXT_QUOTE_ASSETS = new Set(["USD", "USDC", "USDT"]);
const CCXT_INTERVALS = {
  "1m": 60_000,
  "3m": 3 * 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "2h": 2 * 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "6h": 6 * 60 * 60_000,
  "12h": 12 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
  "3d": 3 * 24 * 60 * 60_000,
  "1w": 7 * 24 * 60 * 60_000,
} satisfies Record<CryptoMonitorInterval, number>;

export type CryptoTrend = "bullish" | "bearish";

export type CryptoMonitorRow = {
  symbol: string;
  baseAsset: string;
  assetName: string;
  iconUrl: string | null;
  researchUrl: string;
  quoteAsset: string;
  price: number;
  dailyChangePercent: number;
  quoteVolume: number;
  trend: CryptoTrend;
  lastFlipAt: string | null;
  lastFlipLevel: number | null;
  nextFlipLevel: number;
  distanceToFlipPercent: number;
  sinceFlipPercent: number | null;
  candleClosedAt: string;
  historyComplete: boolean;
};

export function getCryptoIconUrl(baseAsset: string) {
  const normalizedAsset = baseAsset.trim().toLowerCase();

  return /^[a-z0-9]+$/.test(normalizedAsset)
    ? `${COINCAP_ICON_BASE}/${normalizedAsset}@2x.png`
    : null;
}

export type CryptoMonitorPayload = {
  data: CryptoMonitorRow[];
  meta: {
    provider: CryptoMonitorProvider;
    providerLabel: string;
    interval: CryptoMonitorInterval;
    capturedAt: string;
    universe: string;
    requestedMarkets: number;
    returnedMarkets: number;
    failedMarkets: number;
    atrPeriod: number;
    atrMultiplier: number;
    availableProviders: ReturnType<typeof getCryptoExchangeCatalog>;
    failureReasons: string[];
    scope: CryptoMonitorScope;
    scopeLabel: string;
  };
};

type OkxEnvelope<T> = {
  code: string;
  msg: string;
  data: T[];
};

type OkxInstrument = {
  instId: string;
  baseCcy: string;
  quoteCcy: string;
  state: string;
};

type OkxTicker = {
  instId: string;
  last: string;
  open24h: string;
  volCcy24h: string;
};

type CoinGeckoMarket = {
  id: string;
  name: string;
  symbol: string;
  image?: string;
  market_cap?: number | null;
};

type CoinMarketCapMapEntry = {
  symbol: string;
  slug: string;
  rank?: number | null;
  is_active?: number;
};

function parseFiniteNumber(value: string | number | null | undefined, provider = "Binance") {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${provider} returned a non-numeric market value.`);
  }
  return parsed;
}

export function normalizeCryptoMonitorLimit(value?: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(MAX_LIMIT, Math.max(20, Math.floor(parsed)));
}

async function fetchOkxJson<T>(path: string): Promise<T[]> {
  const response = await fetch(`${OKX_API_BASE}${path}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`OKX market data returned HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as OkxEnvelope<T>;
  if (payload.code !== "0") {
    throw new Error(`OKX market data failed: ${payload.msg || `code ${payload.code}`}.`);
  }

  return payload.data;
}

async function loadCoinGeckoMetadata(baseAssets: string[]) {
  const symbols = [...new Set(baseAssets.map((asset) => asset.trim().toLowerCase()))]
    .filter((asset) => /^[a-z0-9]+$/.test(asset));
  const metadata = new Map<string, { id: string; name: string; url: string; marketCap: number }>();

  for (let index = 0; index < symbols.length; index += 50) {
    const batch = symbols.slice(index, index + 50);

    try {
      const response = await fetch(
        `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&symbols=${encodeURIComponent(batch.join(","))}&include_tokens=all&per_page=250&page=1&sparkline=false`,
        {
          next: { revalidate: 300 },
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(12_000),
        },
      );

      if (!response.ok) {
        continue;
      }

      const markets = (await response.json()) as CoinGeckoMarket[];
      for (const market of markets) {
        const image = market.image?.trim();
        if (!image) {
          continue;
        }

        const symbol = market.symbol.trim().toUpperCase();
        const marketCap = market.market_cap ?? 0;
        const current = metadata.get(symbol);
        if (!current || marketCap > current.marketCap) {
          metadata.set(symbol, { id: market.id, name: market.name, url: image, marketCap });
        }
      }
    } catch {
      // CoinGecko is optional metadata; the deterministic CoinCap fallback remains available.
    }
  }

  return metadata;
}

async function loadCoinMarketCapSlugs(baseAssets: string[]) {
  const symbols = [...new Set(baseAssets.map((asset) => asset.trim().toUpperCase()))]
    .filter((asset) => /^[A-Z0-9]+$/.test(asset));
  const slugs = new Map<string, { slug: string; rank: number }>();

  for (let index = 0; index < symbols.length; index += 50) {
    const batch = symbols.slice(index, index + 50);

    try {
      const response = await fetch(
        `${COINMARKETCAP_API_BASE}/cryptocurrency/map?symbol=${encodeURIComponent(batch.join(","))}&listing_status=active`,
        {
          next: { revalidate: 300 },
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(12_000),
        },
      );

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as { data?: CoinMarketCapMapEntry[] };
      for (const entry of payload.data ?? []) {
        const symbol = entry.symbol?.trim().toUpperCase();
        const slug = entry.slug?.trim();
        if (!symbol || !slug || entry.is_active === 0) {
          continue;
        }

        const rank = entry.rank ?? Number.MAX_SAFE_INTEGER;
        const current = slugs.get(symbol);
        if (!current || rank < current.rank) {
          slugs.set(symbol, { slug, rank });
        }
      }
    } catch {
      // CoinMarketCap is optional navigation metadata; the search fallback remains available.
    }
  }

  return slugs;
}

function getCoinMarketCapUrl(slug: string) {
  return `${COINMARKETCAP_COIN_BASE}/${encodeURIComponent(slug)}/`;
}

function getCoinMarketCapSearchUrl(baseAsset: string) {
  return `${COINMARKETCAP_SEARCH_BASE}${encodeURIComponent(baseAsset.trim())}`;
}

function okxBarForInterval(interval: CryptoMonitorInterval) {
  return {
    "1m": "1m",
    "3m": "3m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "1H",
    "2h": "2H",
    "4h": "4H",
    "6h": "6Hutc",
    "12h": "12Hutc",
    "1d": "1Dutc",
    "3d": "3Dutc",
    "1w": "1Wutc",
  }[interval];
}

function okxIntervalMilliseconds(interval: CryptoMonitorInterval) {
  return {
    "1m": 1,
    "3m": 3,
    "5m": 5,
    "15m": 15,
    "30m": 30,
    "1h": 60,
    "2h": 2 * 60,
    "4h": 4 * 60,
    "6h": 6 * 60,
    "12h": 12 * 60,
    "1d": 24 * 60,
    "3d": 3 * 24 * 60,
    "1w": 7 * 24 * 60,
  }[interval] * 60_000;
}

function parseOkxCandles(rows: unknown[][], interval: CryptoMonitorInterval) {
  const now = Date.now();
  const intervalMilliseconds = okxIntervalMilliseconds(interval);

  return rows
    .map((row): CryptoCandle | null => {
      const timestamp = parseFiniteNumber(row[0] as string, "OKX");
      const confirmation = row[8];
      if (confirmation !== "1" || timestamp + intervalMilliseconds >= now) {
        return null;
      }

      return {
        openTime: timestamp,
        open: parseFiniteNumber(row[1] as string, "OKX"),
        high: parseFiniteNumber(row[2] as string, "OKX"),
        low: parseFiniteNumber(row[3] as string, "OKX"),
        close: parseFiniteNumber(row[4] as string, "OKX"),
        closeTime: timestamp + intervalMilliseconds,
      };
    })
    .filter((candle): candle is CryptoCandle => candle !== null)
    .sort((left, right) => left.openTime - right.openTime);
}

function mergeCandles(candles: CryptoCandle[]) {
  const byOpenTime = new Map<number, CryptoCandle>();
  for (const candle of candles) {
    byOpenTime.set(candle.openTime, candle);
  }

  return [...byOpenTime.values()].sort((left, right) => left.openTime - right.openTime);
}

function getCcxtTimeframe(interval: CryptoMonitorInterval, exchange: ReturnType<typeof getCcxtExchange>) {
  const requestedMilliseconds = CCXT_INTERVALS[interval];
  const timeframes = exchange.timeframes ?? {};
  const exact = timeframes[interval];
  if (exact) {
    return { timeframe: interval, sourceMilliseconds: requestedMilliseconds };
  }

  const candidates = Object.keys(timeframes)
    .map((key) => {
      const match = /^(\d+)(m|h|d|w)$/.exec(key);
      if (!match) {
        return null;
      }

      const amount = Number(match[1]);
      const unit = { m: 60_000, h: 60 * 60_000, d: 24 * 60 * 60_000, w: 7 * 24 * 60 * 60_000 }[match[2] as "m" | "h" | "d" | "w"];
      const milliseconds = amount * unit;
      return { key, milliseconds };
    })
    .filter((candidate): candidate is { key: string; milliseconds: number } =>
      candidate != null &&
      candidate.milliseconds <= requestedMilliseconds &&
      requestedMilliseconds % candidate.milliseconds === 0,
    )
    .sort((left, right) => right.milliseconds - left.milliseconds);

  const fallback = candidates[0];
  if (!fallback) {
    throw new Error(`${exchange.name ?? exchange.id} does not expose a compatible ${interval} candle timeframe.`);
  }

  return { timeframe: fallback.key, sourceMilliseconds: fallback.milliseconds };
}

function parseCcxtCandles(
  rows: unknown[][],
  interval: CryptoMonitorInterval,
  sourceMilliseconds: number,
) {
  const now = Date.now();
  const targetMilliseconds = CCXT_INTERVALS[interval];
  const buckets = new Map<number, CryptoCandle>();

  for (const row of rows) {
    const openTime = parseFiniteNumber(row[0] as number, "CCXT");
    const open = parseFiniteNumber(row[1] as number, "CCXT");
    const high = parseFiniteNumber(row[2] as number, "CCXT");
    const low = parseFiniteNumber(row[3] as number, "CCXT");
    const close = parseFiniteNumber(row[4] as number, "CCXT");
    const bucketOpenTime = Math.floor(openTime / targetMilliseconds) * targetMilliseconds;
    const existing = buckets.get(bucketOpenTime);

    buckets.set(bucketOpenTime, {
      openTime: bucketOpenTime,
      open: existing?.open ?? open,
      high: Math.max(existing?.high ?? high, high),
      low: Math.min(existing?.low ?? low, low),
      close,
      closeTime: bucketOpenTime + targetMilliseconds,
    });
  }

  return [...buckets.values()]
    .filter((candle) => candle.closeTime < now && (sourceMilliseconds >= targetMilliseconds || candle.closeTime - candle.openTime >= targetMilliseconds))
    .sort((left, right) => left.openTime - right.openTime);
}

async function fetchCcxtCandles(
  exchange: ReturnType<typeof getCcxtExchange>,
  symbol: string,
  interval: CryptoMonitorInterval,
  limit: number,
  since?: number,
) {
  const resolution = getCcxtTimeframe(interval, exchange);
  const aggregationFactor = Math.max(1, Math.ceil(CCXT_INTERVALS[interval] / resolution.sourceMilliseconds));
  const sourceLimit = Math.min(1_000, Math.max(limit * aggregationFactor + 2, 50));
  const rows = await exchange.fetchOHLCV(symbol, resolution.timeframe, since, sourceLimit);
  return {
    candles: parseCcxtCandles(rows, interval, resolution.sourceMilliseconds),
    sourceLimit,
    sourceMilliseconds: resolution.sourceMilliseconds,
  };
}

async function fetchRecentCcxtCandles(
  provider: CryptoMonitorProvider,
  symbol: string,
  interval: CryptoMonitorInterval,
  scope: CryptoMonitorScope,
) {
  const exchange = getCcxtExchange(provider, scope);
  const resolution = getCcxtTimeframe(interval, exchange);
  const lookback = Math.min(1_000, CHART_CANDLE_LIMIT * Math.max(1, Math.ceil(CCXT_INTERVALS[interval] / resolution.sourceMilliseconds)) + 2);
  const result = await fetchCcxtCandles(
    exchange,
    symbol,
    interval,
    CHART_CANDLE_LIMIT,
    Date.now() - lookback * resolution.sourceMilliseconds,
  );
  return result.candles.slice(-CHART_CANDLE_LIMIT);
}

async function fetchRecentOkxCandles(symbol: string, interval: CryptoMonitorInterval) {
  const params = new URLSearchParams({
    instId: symbol,
    bar: okxBarForInterval(interval),
    limit: String(Math.min(CHART_CANDLE_LIMIT, OKX_KLINE_PAGE_LIMIT)),
  });
  const rows = await fetchOkxJson<unknown[]>(`/api/v5/market/history-candles?${params.toString()}`);
  return parseOkxCandles(rows, interval).slice(-CHART_CANDLE_LIMIT);
}

export async function loadCryptoChart(
  symbol: string,
  interval: CryptoMonitorInterval,
  provider: CryptoMonitorProvider,
  scope: CryptoMonitorScope = CRYPTO_MONITOR_SCOPE,
): Promise<CryptoChartPayload> {
  const normalizedScope = normalizeCryptoMonitorScope(scope);
  const scopedProvider = normalizeCryptoMonitorProvider(provider, normalizedScope);
  if (scopedProvider !== provider) {
    throw new Error(`${provider} is outside the active ${normalizedScope === CRYPTO_MONITOR_SCOPE ? CRYPTO_MONITOR_SCOPE_LABEL : CRYPTO_MONITOR_GLOBAL_SCOPE_LABEL} scope.`);
  }

  const requestIntervals = new Map<CryptoMonitorInterval, Promise<CryptoCandle[]>>();
  const loadInterval = (requestedInterval: CryptoMonitorInterval) => {
    const existing = requestIntervals.get(requestedInterval);
    if (existing) {
      return existing;
    }

    const request = scopedProvider === "okx"
      ? fetchRecentOkxCandles(symbol, requestedInterval)
      : fetchRecentCcxtCandles(scopedProvider, symbol, requestedInterval, normalizedScope);
    requestIntervals.set(requestedInterval, request);
    return request;
  };

  const [candles, dailyCandles, weeklyCandles] = await Promise.all([
    loadInterval(interval),
    loadInterval("1d"),
    loadInterval("1w"),
  ]);

  if (candles.length < ATR_PERIOD + 2) {
    throw new Error("Not enough closed candles to render VargaTrend.");
  }

  return {
    data: { candles, dailyCandles, weeklyCandles },
    meta: {
      provider: scopedProvider,
      interval,
      capturedAt: new Date().toISOString(),
      scope: normalizedScope,
    },
  };
}

type CandleHistory = {
  candles: CryptoCandle[];
  historyComplete: boolean;
};

async function fetchOkxCandleHistory(instId: string, interval: CryptoMonitorInterval): Promise<CandleHistory> {
  const candles: CryptoCandle[] = [];
  let after: string | null = null;

  for (let page = 0; page < MAX_KLINE_HISTORY_PAGES; page += 1) {
    const params = new URLSearchParams({
      instId,
      bar: okxBarForInterval(interval),
      limit: String(OKX_KLINE_PAGE_LIMIT),
    });
    if (after != null) {
      params.set("after", after);
    }

    const rows = await fetchOkxJson<unknown[]>(`/api/v5/market/history-candles?${params.toString()}`);
    const pageCandles = parseOkxCandles(rows, interval);
    if (pageCandles.length === 0) {
      return { candles: mergeCandles(candles), historyComplete: true };
    }

    candles.push(...pageCandles);
    const merged = mergeCandles(candles);
    if (calculateSupertrend(merged).lastFlipAt != null) {
      return { candles: merged, historyComplete: false };
    }

    if (rows.length < OKX_KLINE_PAGE_LIMIT) {
      return { candles: merged, historyComplete: true };
    }

    const oldestOpenTime = pageCandles[0].openTime;
    const nextAfter = String(oldestOpenTime);
    if (after === nextAfter) {
      return { candles: merged, historyComplete: true };
    }
    after = nextAfter;
  }

  return { candles: mergeCandles(candles), historyComplete: false };
}

async function fetchCcxtCandleHistory(
  provider: CryptoMonitorProvider,
  symbol: string,
  interval: CryptoMonitorInterval,
  scope: CryptoMonitorScope,
): Promise<CandleHistory> {
  const exchange = getCcxtExchange(provider, scope);
  const firstResolution = getCcxtTimeframe(interval, exchange);
  const candles: CryptoCandle[] = [];
  const lookback = Math.min(
    1_000,
    CCXT_KLINE_PAGE_LIMIT * Math.max(1, Math.ceil(CCXT_INTERVALS[interval] / firstResolution.sourceMilliseconds)),
  );
  let since = Date.now() - lookback * firstResolution.sourceMilliseconds;
  let previousOldestOpenTime: number | null = null;

  for (let page = 0; page < MAX_KLINE_HISTORY_PAGES; page += 1) {
    const result = await fetchCcxtCandles(exchange, symbol, interval, CCXT_KLINE_PAGE_LIMIT, since);
    if (result.candles.length === 0) {
      return { candles: mergeCandles(candles), historyComplete: true };
    }

    candles.push(...result.candles);
    const merged = mergeCandles(candles);
    if (calculateSupertrend(merged).lastFlipAt != null) {
      return { candles: merged, historyComplete: false };
    }

    const oldestOpenTime = result.candles[0].openTime;
    if (previousOldestOpenTime === oldestOpenTime || result.sourceLimit > result.candles.length) {
      return { candles: merged, historyComplete: true };
    }

    previousOldestOpenTime = oldestOpenTime;
    since = oldestOpenTime - result.sourceLimit * result.sourceMilliseconds;
  }

  return { candles: mergeCandles(candles), historyComplete: false };
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let cursor = 0;

  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

export async function loadCryptoMonitor(
  interval: CryptoMonitorInterval,
  limit = DEFAULT_LIMIT,
  provider: CryptoMonitorProvider = "okx",
  scope: CryptoMonitorScope = CRYPTO_MONITOR_SCOPE,
): Promise<CryptoMonitorPayload> {
  const safeLimit = Math.min(MAX_LIMIT, Math.max(20, limit));
  const normalizedScope = normalizeCryptoMonitorScope(scope);
  const normalizedProvider = normalizeCryptoMonitorProvider(provider, normalizedScope);
  if (normalizedProvider === "okx") {
    return loadOkxCryptoMonitor(interval, safeLimit, normalizedScope);
  }

  return loadCcxtCryptoMonitor(interval, safeLimit, normalizedProvider, normalizedScope);
}

async function loadOkxCryptoMonitor(
  interval: CryptoMonitorInterval,
  safeLimit: number,
  scope: CryptoMonitorScope,
) {
  const [instruments, tickers] = await Promise.all([
    fetchOkxJson<OkxInstrument>("/api/v5/public/instruments?instType=SPOT"),
    fetchOkxJson<OkxTicker>("/api/v5/market/tickers?instType=SPOT"),
  ]);

  const eligibleInstruments = new Map(
    instruments
      .filter(
        (market) =>
          market.state === "live" &&
          market.quoteCcy === "USDT" &&
          isFlipEligibleBaseAsset(market.baseCcy),
      )
      .map((market) => [market.instId, market]),
  );

  const selected = tickers
    .filter((ticker) => eligibleInstruments.has(ticker.instId))
    .sort(
      (left, right) =>
        parseFiniteNumber(right.volCcy24h, "OKX") - parseFiniteNumber(left.volCcy24h, "OKX"),
    )
    .slice(0, safeLimit);
  const baseAssets = selected.map((ticker) => eligibleInstruments.get(ticker.instId)!.baseCcy);
  const [coinGeckoMetadata, coinMarketCapSlugs] = await Promise.all([
    loadCoinGeckoMetadata(baseAssets),
    loadCoinMarketCapSlugs(baseAssets),
  ]);

  const settled = await mapWithConcurrency(selected, 8, async (ticker) => {
    try {
      const history = await fetchOkxCandleHistory(ticker.instId, interval);
      const supertrend = calculateSupertrend(history.candles);
      const market = eligibleInstruments.get(ticker.instId)!;
      const price = parseFiniteNumber(ticker.last, "OKX");
      const open24h = parseFiniteNumber(ticker.open24h || price, "OKX");
      const metadata = coinGeckoMetadata.get(market.baseCcy.toUpperCase());
      const coinMarketCap = coinMarketCapSlugs.get(market.baseCcy.toUpperCase());

      return {
        ok: true as const,
        row: {
          symbol: ticker.instId,
          baseAsset: market.baseCcy,
          assetName: metadata?.name ?? market.baseCcy,
          iconUrl: metadata?.url ?? getCryptoIconUrl(market.baseCcy),
          researchUrl: coinMarketCap
            ? getCoinMarketCapUrl(coinMarketCap.slug)
            : getCoinMarketCapSearchUrl(market.baseCcy),
          quoteAsset: "USDT" as const,
          price,
          dailyChangePercent: open24h > 0 ? (price / open24h - 1) * 100 : 0,
          quoteVolume: parseFiniteNumber(ticker.volCcy24h, "OKX"),
          trend: supertrend.trend === 1 ? ("bullish" as const) : ("bearish" as const),
          lastFlipAt: supertrend.lastFlipAt ? new Date(supertrend.lastFlipAt).toISOString() : null,
          lastFlipLevel: supertrend.lastFlipLevel,
          nextFlipLevel: supertrend.nextFlipLevel,
          distanceToFlipPercent: Math.abs((price - supertrend.nextFlipLevel) / price) * 100,
          sinceFlipPercent:
            supertrend.lastFlipClose == null
              ? null
              : (supertrend.close / supertrend.lastFlipClose - 1) * 100,
          candleClosedAt: new Date(supertrend.closeTime).toISOString(),
          historyComplete: history.historyComplete,
        } satisfies CryptoMonitorRow,
      };
    } catch {
      return { ok: false as const };
    }
  });

  const data = settled.flatMap((result) => (result.ok ? [result.row] : []));

  return {
    data,
    meta: {
      provider: "okx" as const,
      providerLabel: `${getCryptoExchangeLabel("okx", scope)} public market data`,
      interval,
      capturedAt: new Date().toISOString(),
      universe: "Most liquid active OKX USDT spot markets",
      requestedMarkets: selected.length,
      returnedMarkets: data.length,
      failedMarkets: selected.length - data.length,
      atrPeriod: ATR_PERIOD,
      atrMultiplier: ATR_MULTIPLIER,
      availableProviders: getCryptoExchangeCatalog(scope),
      failureReasons: [],
      scope,
      scopeLabel: scope === CRYPTO_MONITOR_SCOPE ? CRYPTO_MONITOR_SCOPE_LABEL : CRYPTO_MONITOR_GLOBAL_SCOPE_LABEL,
    },
  };
}

function isCcxtSpotMarket(market: CcxtMarket) {
  return market.active !== false &&
    (market.spot === true || (market.type === "spot" && market.contract !== true)) &&
    market.contract !== true &&
    market.linear !== true &&
    market.inverse !== true &&
    typeof market.symbol === "string" &&
    typeof market.base === "string" &&
    typeof market.quote === "string" &&
    CCXT_QUOTE_ASSETS.has(market.quote.toUpperCase()) &&
    isFlipEligibleBaseAsset(market.base);
}

function getCcxtTickerVolume(ticker: CcxtTicker, price: number) {
  if (typeof ticker.quoteVolume === "number" && Number.isFinite(ticker.quoteVolume)) {
    return ticker.quoteVolume;
  }

  if (typeof ticker.baseVolume === "number" && Number.isFinite(ticker.baseVolume)) {
    return ticker.baseVolume * price;
  }

  return 0;
}

function getCcxtDailyChange(ticker: CcxtTicker, price: number) {
  if (typeof ticker.percentage === "number" && Number.isFinite(ticker.percentage)) {
    return ticker.percentage;
  }

  if (typeof ticker.open === "number" && ticker.open > 0) {
    return (price / ticker.open - 1) * 100;
  }

  return 0;
}

async function loadCcxtCryptoMonitor(
  interval: CryptoMonitorInterval,
  safeLimit: number,
  provider: CryptoMonitorProvider,
  scope: CryptoMonitorScope,
) {
  const exchange = getCcxtExchange(provider, scope);
  const markets = await exchange.loadMarkets();
  const eligibleMarkets = new Map(
    Object.values(markets)
      .filter(isCcxtSpotMarket)
      .map((market) => [market.symbol!, market]),
  );

  if (eligibleMarkets.size === 0) {
    throw new Error(`${getCryptoExchangeLabel(provider, scope)} returned no active dollar-quoted spot markets.`);
  }

  const rawTickers = await exchange.fetchTickers();
  const selected = Object.entries(rawTickers)
    .map(([key, ticker]) => {
      const symbol = ticker.symbol ?? key;
      const market = eligibleMarkets.get(symbol);
      if (!market || typeof ticker.last !== "number" || !Number.isFinite(ticker.last) || ticker.last <= 0) {
        return null;
      }

      return { symbol, ticker, market, volume: getCcxtTickerVolume(ticker, ticker.last) };
    })
    .filter((entry): entry is {
      symbol: string;
      ticker: CcxtTicker & { last: number };
      market: CcxtMarket & { base: string; quote: string; symbol: string };
      volume: number;
    } => entry !== null)
    .sort((left, right) => right.volume - left.volume)
    .slice(0, safeLimit);

  const baseAssets = selected.map((entry) => entry.market.base);
  const [coinGeckoMetadata, coinMarketCapSlugs] = await Promise.all([
    loadCoinGeckoMetadata(baseAssets),
    loadCoinMarketCapSlugs(baseAssets),
  ]);

  const failureReasons = new Set<string>();
  const settled = await mapWithConcurrency(selected, 8, async ({ symbol, ticker, market, volume }) => {
    try {
      const history = await fetchCcxtCandleHistory(provider, symbol, interval, scope);
      const supertrend = calculateSupertrend(history.candles);
      const baseAsset = market.base;
      const metadata = coinGeckoMetadata.get(baseAsset.toUpperCase());
      const coinMarketCap = coinMarketCapSlugs.get(baseAsset.toUpperCase());
      const price = ticker.last;

      return {
        ok: true as const,
        row: {
          symbol,
          baseAsset,
          assetName: metadata?.name ?? baseAsset,
          iconUrl: metadata?.url ?? getCryptoIconUrl(baseAsset),
          researchUrl: coinMarketCap
            ? getCoinMarketCapUrl(coinMarketCap.slug)
            : getCoinMarketCapSearchUrl(baseAsset),
          quoteAsset: market.quote,
          price,
          dailyChangePercent: getCcxtDailyChange(ticker, price),
          quoteVolume: volume,
          trend: supertrend.trend === 1 ? ("bullish" as const) : ("bearish" as const),
          lastFlipAt: supertrend.lastFlipAt ? new Date(supertrend.lastFlipAt).toISOString() : null,
          lastFlipLevel: supertrend.lastFlipLevel,
          nextFlipLevel: supertrend.nextFlipLevel,
          distanceToFlipPercent: Math.abs((price - supertrend.nextFlipLevel) / price) * 100,
          sinceFlipPercent:
            supertrend.lastFlipClose == null
              ? null
              : (supertrend.close / supertrend.lastFlipClose - 1) * 100,
          candleClosedAt: new Date(supertrend.closeTime).toISOString(),
          historyComplete: history.historyComplete,
        } satisfies CryptoMonitorRow,
      };
    } catch (error) {
      failureReasons.add(error instanceof Error ? error.message : "Provider candle data could not be normalized.");
      return { ok: false as const };
    }
  });

  const data = settled.flatMap((result) => (result.ok ? [result.row] : []));
  const exchangeLabel = getCryptoExchangeLabel(provider, scope);

  return {
    data,
    meta: {
      provider,
      providerLabel: `${exchangeLabel} public market data`,
      interval,
      capturedAt: new Date().toISOString(),
      universe: `Most liquid active ${exchangeLabel} spot markets quoted in USD, USDC, or USDT`,
      requestedMarkets: selected.length,
      returnedMarkets: data.length,
      failedMarkets: selected.length - data.length,
      atrPeriod: ATR_PERIOD,
      atrMultiplier: ATR_MULTIPLIER,
      availableProviders: getCryptoExchangeCatalog(scope),
      failureReasons: [...failureReasons].slice(0, 3),
      scope,
      scopeLabel: scope === CRYPTO_MONITOR_SCOPE ? CRYPTO_MONITOR_SCOPE_LABEL : CRYPTO_MONITOR_GLOBAL_SCOPE_LABEL,
    },
  } satisfies CryptoMonitorPayload;
}
