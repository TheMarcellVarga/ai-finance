export type AssetMonitorDefinition = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  href: string;
  icon: string;
  tone: "cyan" | "amber" | "teal";
  coverage: string;
};

export const assetMonitorDefinitions: AssetMonitorDefinition[] = [
  {
    id: "equities",
    label: "Equities",
    shortLabel: "Listed ownership",
    description: "Major developed and emerging-market companies in one daily reference view.",
    href: "/app/monitors/equities",
    icon: "↗",
    tone: "cyan",
    coverage: "Global listed sample",
  },
  {
    id: "fixed-income",
    label: "Fixed income",
    shortLabel: "Rates & credit",
    description: "Treasury duration, aggregate bonds, credit, and emerging-market debt proxies.",
    href: "/app/monitors/fixed-income",
    icon: "⌁",
    tone: "teal",
    coverage: "Bond-fund proxy sample",
  },
  {
    id: "funds",
    label: "Funds & indexes",
    shortLabel: "Diversified vehicles",
    description: "World, regional, factor, and index vehicles used to frame broad exposure.",
    href: "/app/monitors/funds",
    icon: "▦",
    tone: "cyan",
    coverage: "Listed ETF / index sample",
  },
  {
    id: "currencies",
    label: "Currencies",
    shortLabel: "Daily reference rates",
    description: "Central-bank reference rates for major and regional currency pairs.",
    href: "/app/monitors/currencies",
    icon: "◎",
    tone: "amber",
    coverage: "98 central-bank sources",
  },
  {
    id: "commodities",
    label: "Commodities",
    shortLabel: "Energy, metals & crops",
    description: "Public front-contract references across energy, metals, and agriculture.",
    href: "/app/monitors/commodities",
    icon: "◈",
    tone: "amber",
    coverage: "Exchange-traded futures",
  },
  {
    id: "real-estate",
    label: "Real estate",
    shortLabel: "Listed property",
    description: "REITs and property funds that keep the public-market slice visible.",
    href: "/app/monitors/real-estate",
    icon: "⌂",
    tone: "teal",
    coverage: "Listed REIT proxy sample",
  },
  {
    id: "derivatives",
    label: "Derivatives",
    shortLabel: "Futures references",
    description: "Equity-index, Treasury, energy, and metals futures without order workflows.",
    href: "/app/monitors/derivatives",
    icon: "⇄",
    tone: "cyan",
    coverage: "Front-contract sample",
  },
  {
    id: "private-markets",
    label: "Private markets",
    shortLabel: "Listed access proxies",
    description: "Public BDC and listed private-equity vehicles as transparent reference proxies.",
    href: "/app/monitors/private-markets",
    icon: "▤",
    tone: "amber",
    coverage: "Listed proxy sample",
  },
  {
    id: "cash-rates",
    label: "Cash & rates",
    shortLabel: "Liquidity context",
    description: "Short Treasury yields and cash-management vehicles for rate context.",
    href: "/app/monitors/cash-rates",
    icon: "◌",
    tone: "teal",
    coverage: "Treasury curve + cash proxies",
  },
  {
    id: "protection",
    label: "Protection & contracts",
    shortLabel: "Insurance & income",
    description: "Listed insurance, preferred-income, and inflation-linked reference proxies.",
    href: "/app/monitors/protection",
    icon: "◇",
    tone: "amber",
    coverage: "Listed contract proxies",
  },
  {
    id: "crypto",
    label: "Digital assets",
    shortLabel: "Crypto research monitor",
    description: "The dedicated Adaptive Supertrend monitor for public spot crypto markets.",
    href: "/app/crypto-monitor",
    icon: "₿",
    tone: "cyan",
    coverage: "OKX + public exchange spot",
  },
];

export const assetMonitorFilterDefinitions = [
  ...assetMonitorDefinitions.filter((definition) => definition.id === "crypto"),
  ...assetMonitorDefinitions.filter((definition) => definition.id !== "crypto"),
];

export function getAssetMonitorDefinition(id: string) {
  return assetMonitorDefinitions.find((definition) => definition.id === id);
}
