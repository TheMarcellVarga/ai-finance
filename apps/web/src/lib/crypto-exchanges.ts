import "server-only";

import ccxt from "ccxt";

export type CryptoExchangeSource = "native" | "ccxt";

export type CryptoExchangeOption = {
  id: string;
  label: string;
  source: CryptoExchangeSource;
};

export type CryptoMonitorScope = "singapore_mas_dpt" | "global";

export const CRYPTO_MONITOR_SCOPE = "singapore_mas_dpt" as const;
export const CRYPTO_MONITOR_SCOPE_LABEL = "Singapore / MAS-authorised DPT providers";
export const CRYPTO_MONITOR_GLOBAL_SCOPE = "global" as const;
export const CRYPTO_MONITOR_GLOBAL_SCOPE_LABEL = "All supported public exchanges";

export type CcxtMarket = {
  symbol?: string;
  base?: string;
  quote?: string;
  type?: string;
  spot?: boolean;
  active?: boolean;
  contract?: boolean;
  linear?: boolean;
  inverse?: boolean;
};

export type CcxtTicker = {
  symbol?: string;
  last?: number | null;
  percentage?: number | null;
  open?: number | null;
  quoteVolume?: number | null;
  baseVolume?: number | null;
  timestamp?: number | null;
  datetime?: string | null;
};

export type CcxtExchange = {
  id: string;
  name?: string;
  has?: Record<string, unknown>;
  timeframes?: Record<string, string | number>;
  loadMarkets: (
    reload?: boolean,
    params?: Record<string, unknown>,
  ) => Promise<Record<string, CcxtMarket>>;
  fetchTickers: (
    symbols?: string[],
    params?: Record<string, unknown>,
  ) => Promise<Record<string, CcxtTicker>>;
  fetchOHLCV: (
    symbol: string,
    timeframe?: string,
    since?: number,
    limit?: number,
    params?: Record<string, unknown>,
  ) => Promise<unknown[][]>;
};

type CcxtConstructor = new (options?: Record<string, unknown>) => CcxtExchange;

const ACTIVE_NATIVE_PROVIDERS = ["okx"] as const;

/**
 * The monitor is intentionally scoped to this server-owned allowlist. These
 * IDs are mapped to Singapore entities in MAS's Digital Payment Token Service
 * directory and must also expose public ticker and OHLCV data through CCXT.
 * Re-verify this mapping when the MAS directory or provider legal entities
 * change; this is a compliance scope, not a claim that every global endpoint
 * is operated by the Singapore entity.
 */
const SINGAPORE_MAS_PROVIDER_LABELS = new Map<string, string>([
  ["bitstamp", "Bitstamp Singapore"],
  ["coinbaseexchange", "Coinbase Singapore"],
  ["cryptocom", "Crypto.com Singapore"],
  ["gemini", "Gemini Singapore"],
  ["hashkey", "HashKey Singapore"],
  ["revolutx", "Revolut X Singapore"],
  ["upbit", "Upbit Singapore"],
]);
const MAS_NATIVE_PROVIDER_LABELS = new Map<string, string>([["okx", "OKX Singapore"]]);
const exchangeConstructors = ccxt as unknown as Record<string, unknown>;

function supports(exchange: CcxtExchange, capability: string) {
  const value = exchange.has?.[capability];
  return value === true || value === "emulated";
}

function instantiateExchange(id: string) {
  const constructor = exchangeConstructors[id];
  if (typeof constructor !== "function") {
    return null;
  }

  try {
    const exchange = new (constructor as CcxtConstructor)({
      enableRateLimit: true,
      timeout: 12_000,
    });

    return supports(exchange, "fetchTickers") && supports(exchange, "fetchOHLCV") ? exchange : null;
  } catch {
    return null;
  }
}

const scopedCcxtExchanges = ccxt.exchanges
  .filter((id) => SINGAPORE_MAS_PROVIDER_LABELS.has(id))
  .flatMap((id) => {
    const exchange = instantiateExchange(id);
    return exchange ? [{ id, label: SINGAPORE_MAS_PROVIDER_LABELS.get(id) ?? exchange.name?.trim() ?? id }] : [];
  });

export type CryptoMonitorProvider = string;

const nativeExchangeCatalog: CryptoExchangeOption[] = [
  ...ACTIVE_NATIVE_PROVIDERS.map((id) => ({
    id,
    label: MAS_NATIVE_PROVIDER_LABELS.get(id) ?? id,
    source: "native" as const,
  })),
];

const scopedExchangeCatalog: CryptoExchangeOption[] = [
  ...nativeExchangeCatalog,
  ...scopedCcxtExchanges.map((exchange) => ({ ...exchange, source: "ccxt" as const })),
];

const globalCcxtExchanges = ccxt.exchanges
  .filter((id) => !ACTIVE_NATIVE_PROVIDERS.includes(id as (typeof ACTIVE_NATIVE_PROVIDERS)[number]))
  .flatMap((id) => {
    const exchange = instantiateExchange(id);
    return exchange ? [{ id, label: exchange.name?.trim() || id }] : [];
  });

const globalExchangeCatalog: CryptoExchangeOption[] = [
  ...nativeExchangeCatalog,
  ...globalCcxtExchanges.map((exchange) => ({ ...exchange, source: "ccxt" as const })),
];

export const cryptoMonitorProviders = globalExchangeCatalog.map((exchange) => exchange.id) as readonly string[];

function getExchangeCatalog(scope: CryptoMonitorScope) {
  return scope === CRYPTO_MONITOR_GLOBAL_SCOPE ? globalExchangeCatalog : scopedExchangeCatalog;
}

const exchangeInstances = new Map<string, CcxtExchange>();

export function getCryptoExchangeCatalog(scope: CryptoMonitorScope = CRYPTO_MONITOR_SCOPE) {
  return getExchangeCatalog(scope).map((exchange) => ({ ...exchange }));
}

export function normalizeCryptoMonitorScope(value?: string | null): CryptoMonitorScope {
  return value?.trim().toLowerCase() === CRYPTO_MONITOR_GLOBAL_SCOPE
    ? CRYPTO_MONITOR_GLOBAL_SCOPE
    : CRYPTO_MONITOR_SCOPE;
}

export function normalizeCryptoMonitorProvider(
  value?: string | null,
  scope: CryptoMonitorScope = CRYPTO_MONITOR_SCOPE,
): CryptoMonitorProvider {
  const normalized = value?.trim().toLowerCase();
  const exchangeCatalog = getExchangeCatalog(scope);
  return normalized && exchangeCatalog.some((exchange) => exchange.id === normalized) ? normalized : "okx";
}

export function getCryptoExchangeLabel(
  provider: CryptoMonitorProvider,
  scope: CryptoMonitorScope = CRYPTO_MONITOR_SCOPE,
) {
  return getExchangeCatalog(scope).find((exchange) => exchange.id === provider)?.label ?? provider;
}

export function getCcxtExchange(
  provider: CryptoMonitorProvider,
  scope: CryptoMonitorScope = CRYPTO_MONITOR_SCOPE,
) {
  if (!getExchangeCatalog(scope).some((exchange) => exchange.id === provider) || ACTIVE_NATIVE_PROVIDERS.includes(provider as (typeof ACTIVE_NATIVE_PROVIDERS)[number])) {
    throw new Error(`Unsupported CCXT crypto exchange: ${provider}.`);
  }

  const existing = exchangeInstances.get(provider);
  if (existing) {
    return existing;
  }

  const exchange = instantiateExchange(provider);
  if (!exchange) {
    throw new Error(`${getCryptoExchangeLabel(provider, scope)} does not expose public ticker and candle data.`);
  }

  exchangeInstances.set(provider, exchange);
  return exchange;
}
