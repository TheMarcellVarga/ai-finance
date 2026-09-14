export const assetClassOptions = [
  ["", "All asset classes"],
  ["equity", "Equity"],
  ["preferred_stock", "Preferred stock"],
  ["etf", "ETF"],
  ["mutual_fund", "Mutual fund"],
  ["closed_end_fund", "Closed-end fund"],
  ["money_market_fund", "Money-market fund"],
  ["index", "Index"],
  ["bond", "Bond"],
  ["government_bond", "Government bond"],
  ["treasury", "Treasury"],
  ["corporate_bond", "Corporate bond"],
  ["municipal_bond", "Municipal bond"],
  ["certificate_of_deposit", "Certificate of deposit"],
  ["reit", "REIT"],
  ["real_estate", "Real estate"],
  ["private_equity", "Private equity"],
  ["venture_capital", "Venture capital"],
  ["private_debt", "Private debt"],
  ["option", "Option"],
  ["warrant", "Warrant"],
  ["future", "Future"],
  ["forward", "Forward"],
  ["swap", "Swap"],
  ["forex", "Foreign exchange"],
  ["commodity", "Commodity"],
  ["structured_product", "Structured product"],
  ["annuity", "Annuity"],
  ["insurance", "Insurance"],
  ["pension", "Pension"],
  ["cash", "Cash"],
  ["cryptocurrency", "Cryptocurrency"],
  ["stablecoin", "Stablecoin"],
  ["tokenized_asset", "Tokenized asset"],
  ["other", "Other"],
] as const;

export type AssetCatalogClass = {
  id: string;
  label: string;
  description: string;
};

export type FinanceAssetCatalog = {
  assetClasses: AssetCatalogClass[];
  regions: string[];
  countryCoverage: {
    standard: string;
    acceptedCodePattern: string;
    allCodesAccepted: boolean;
    scope: string;
  };
  currencyStandard: string;
};
