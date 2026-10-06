import centroids from "@/data/country-centroids.json";

export type GeographyScope = "country" | "global" | "unattributed";

export type GeographyItem = {
  id: string;
  label: string;
  scope: GeographyScope;
  countryCode?: string;
  value?: number;
  basis: string;
};

type Country = { name: string; lat: number; lng: number };
const countries: Record<string, Country> = { ...(centroids as Record<string, Country>), TW: { name: "Taiwan", lat: 23.7, lng: 121 }, XK: { name: "Kosovo", lat: 42.6, lng: 21 } };
const countryCodeAliases: Record<string, string> = { UK: "GB", EL: "GR" };

type AssetLocationFields = {
  countryCode?: string;
  countrySource?: string;
  country?: string;
  isin?: string;
  mic?: string;
  exchange?: string;
  ticker?: string;
};

const venueCountry: Record<string, string> = {
  XNYS: "US", XNAS: "US", ARCX: "US", NYSE: "US", NASDAQ: "US", NYQ: "US", NMS: "US", NGM: "US", PCX: "US", AMEX: "US", BTS: "US",
  XTKS: "JP", JPX: "JP", TSE: "JP", XHKG: "HK", HKEX: "HK", SEHK: "HK", HKG: "HK",
  XLON: "GB", LSE: "GB", XETR: "DE", XFRA: "DE", XAMS: "NL", XPAR: "FR",
  XTSE: "CA", TSX: "CA", XASX: "AU", ASX: "AU", XSES: "SG", SGX: "SG",
  XNSE: "IN", NSE: "IN", NSI: "IN", XBOM: "IN", BSE: "IN", XKRX: "KR", KRX: "KR",
  XSHG: "CN", SSE: "CN", XSHE: "CN", SZSE: "CN", XSWX: "CH", SIX: "CH",
};

const globalMarketClasses = new Set(["crypto", "currencies", "commodities", "derivatives"]);

export function countryLocation(code?: string) {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase();
  return countries[countryCodeAliases[normalized] ?? normalized];
}

function countryFromName(name?: string) {
  const normalized = name?.trim().toLowerCase();
  if (!normalized) return undefined;
  const aliases: Record<string, string> = { "united states of america": "US", usa: "US", uk: "GB", "united kingdom": "GB", "south korea": "KR", "hong kong": "HK" };
  if (aliases[normalized]) return aliases[normalized];
  return Object.entries(countries).find(([, country]) => country.name.toLowerCase() === normalized)?.[0];
}

function resolveCountry(input: AssetLocationFields): { code: string; basis: string } | undefined {
  const rawProviderCode = input.countryCode?.trim().toUpperCase();
  const providerCode = rawProviderCode ? countryCodeAliases[rawProviderCode] ?? rawProviderCode : undefined;
  const sourceName = ({ fmp: "FMP", "fmp-profile": "FMP", "twelve-data": "Twelve Data" } as Record<string, string>)[input.countrySource ?? ""] ?? input.countrySource;
  if (countryLocation(providerCode)) return { code: providerCode!, basis: sourceName ? `${sourceName} reported country; underlying exposure may differ` : "Provider country metadata; underlying exposure may differ" };

  const namedCode = countryFromName(input.country);
  if (namedCode && countryLocation(namedCode)) return { code: namedCode, basis: "Provider country name" };

  const isinCode = input.isin?.trim().slice(0, 2).toUpperCase();
  if (countryLocation(isinCode)) return { code: isinCode!, basis: "ISIN registration country; economic exposure may differ" };

  for (const venue of [input.mic, input.exchange]) {
    const venueCode = venueCountry[venue?.trim().toUpperCase() ?? ""];
    if (venueCode) return { code: venueCode, basis: "Listing venue country; issuer and economic exposure may differ" };
  }

  return undefined;
}

function isCrypto(assetClass?: string, type?: string) {
  return [assetClass, type].some((value) => value?.toLowerCase().includes("crypto") || value?.toLowerCase() === "digital_asset");
}

export function assetGeography(asset: AssetLocationFields & { assetClass?: string; type?: string }, id: string, value?: number): GeographyItem {
  const label = asset.ticker || id;
  if (isCrypto(asset.assetClass, asset.type)) return { id, label, value, scope: "global", basis: "Decentralized network; an exchange venue is not an asset domicile" };
  if (["currency", "currencies", "fx", "commodity", "commodities"].includes((asset.assetClass || asset.type || "").toLowerCase())) {
    return { id, label, value, scope: "global", basis: "Cross-border market reference with no single country location" };
  }
  const location = resolveCountry(asset);
  if (location) return { id, label, value, scope: "country", countryCode: location.code, basis: location.basis };
  return { id, label, value, scope: "unattributed", basis: "Provider did not supply a defensible country; no location was inferred" };
}

export function marketGeography(row: AssetLocationFields & { symbol: string; assetClass: string; venue?: string }): GeographyItem {
  const id = `${row.assetClass}:${row.symbol}`;
  const label = row.symbol;
  if (row.assetClass === "crypto") return { id, label, scope: "global", basis: "Decentralized network; exchange venue is not asset domicile" };
  if (globalMarketClasses.has(row.assetClass)) return { id, label, scope: "global", basis: "Cross-border market reference with no single country location" };

  const explicit = resolveCountry({ countryCode: row.countryCode, countrySource: row.countrySource, country: row.country, isin: row.isin });
  if (explicit) return { id, label, scope: "country", countryCode: explicit.code, basis: explicit.basis };

  const listing = resolveCountry({ ticker: row.symbol, mic: row.mic, exchange: row.exchange || row.venue });
  if (listing) return { id, label, scope: "country", countryCode: listing.code, basis: listing.basis };
  if (row.assetClass === "cash-rates" && /^\^(IRX|FVX|TNX|TYX)$/.test(row.symbol)) {
    return { id, label, scope: "country", countryCode: "US", basis: "U.S. Treasury reference" };
  }
  return { id, label, scope: "unattributed", basis: "Provider did not supply a defensible country; no location was inferred" };
}

export function geographyLabel(item: GeographyItem) {
  if (item.scope === "global") return "Global / cross-border";
  if (item.scope === "unattributed") return "Country not supplied";
  const country = countryLocation(item.countryCode);
  return country ? `${country.name} · ${item.countryCode?.toUpperCase()}` : "Country not supplied";
}
