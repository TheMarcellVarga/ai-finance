package assets

import (
	"regexp"
	"strings"
)

// AssetClassDefinition is the stable taxonomy exposed to clients. Provider
// instrument labels are normalized into these IDs before they cross the API.
type AssetClassDefinition struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

var assetClassDefinitions = []AssetClassDefinition{
	{ID: "equity", Label: "Equity", Description: "Public company shares and common stock."},
	{ID: "preferred_stock", Label: "Preferred stock", Description: "Preferred shares with equity and income characteristics."},
	{ID: "etf", Label: "ETF", Description: "Exchange-traded funds and index-tracking funds."},
	{ID: "mutual_fund", Label: "Mutual fund", Description: "Open-end pooled investment funds."},
	{ID: "closed_end_fund", Label: "Closed-end fund", Description: "Exchange-traded closed-end investment companies."},
	{ID: "money_market_fund", Label: "Money-market fund", Description: "Funds designed for short-duration cash management."},
	{ID: "index", Label: "Index", Description: "Tracked market or economic indexes."},
	{ID: "bond", Label: "Bond", Description: "Debt instruments and fixed-income securities."},
	{ID: "government_bond", Label: "Government bond", Description: "Sovereign and public-sector debt."},
	{ID: "treasury", Label: "Treasury", Description: "Treasury bills, notes, bonds, and inflation-linked debt."},
	{ID: "corporate_bond", Label: "Corporate bond", Description: "Debt issued by companies."},
	{ID: "municipal_bond", Label: "Municipal bond", Description: "Debt issued by local or regional governments."},
	{ID: "certificate_of_deposit", Label: "Certificate of deposit", Description: "Term deposits and negotiable certificates of deposit."},
	{ID: "reit", Label: "REIT", Description: "Listed real-estate investment trusts."},
	{ID: "real_estate", Label: "Real estate", Description: "Direct or platform-held real-estate interests."},
	{ID: "private_equity", Label: "Private equity", Description: "Private company equity and buyout interests."},
	{ID: "venture_capital", Label: "Venture capital", Description: "Private early-stage company interests."},
	{ID: "private_debt", Label: "Private debt", Description: "Privately originated credit and lending interests."},
	{ID: "option", Label: "Option", Description: "Listed or over-the-counter option contracts."},
	{ID: "warrant", Label: "Warrant", Description: "Rights to acquire an underlying security."},
	{ID: "future", Label: "Future", Description: "Exchange-traded futures contracts."},
	{ID: "forward", Label: "Forward", Description: "Forward contracts and privately negotiated forwards."},
	{ID: "swap", Label: "Swap", Description: "Swap contracts and related derivatives."},
	{ID: "forex", Label: "Foreign exchange", Description: "Currency pairs and foreign-exchange instruments."},
	{ID: "commodity", Label: "Commodity", Description: "Energy, metals, agriculture, and other commodities."},
	{ID: "structured_product", Label: "Structured product", Description: "Notes and products combining debt and derivative exposures."},
	{ID: "annuity", Label: "Annuity", Description: "Insurance-based income and accumulation contracts."},
	{ID: "insurance", Label: "Insurance", Description: "Insurance-linked financial interests."},
	{ID: "pension", Label: "Pension", Description: "Pension and retirement-plan interests."},
	{ID: "cash", Label: "Cash", Description: "Cash balances and cash-equivalent positions."},
	{ID: "cryptocurrency", Label: "Cryptocurrency", Description: "Digital assets and blockchain-native tokens."},
	{ID: "stablecoin", Label: "Stablecoin", Description: "Digital tokens designed to track a reference value."},
	{ID: "tokenized_asset", Label: "Tokenized asset", Description: "Blockchain representations of underlying assets."},
	{ID: "other", Label: "Other", Description: "Provider instruments that do not map to a narrower class."},
}

var isoAlpha2Pattern = regexp.MustCompile(`^[A-Z]{2}$`)

// AssetClasses returns a copy so callers cannot mutate the API catalog.
func AssetClasses() []AssetClassDefinition {
	return append([]AssetClassDefinition(nil), assetClassDefinitions...)
}

func NormalizeAssetClass(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	normalized = strings.ReplaceAll(normalized, "-", "_")
	normalized = strings.ReplaceAll(normalized, " ", "_")
	switch normalized {
	case "stock", "stocks", "share", "shares", "common_stock", "common_share", "common_shares", "ordinary_share":
		return "equity"
	case "fund", "exchange_traded_fund", "exchange_traded_funds", "index_fund":
		return "etf"
	case "mutual", "open_end_fund", "open_ended_fund":
		return "mutual_fund"
	case "closed_end", "closed_ended_fund":
		return "closed_end_fund"
	case "money_market", "money_market_funds":
		return "money_market_fund"
	case "government", "sovereign_bond", "sovereign_debt":
		return "government_bond"
	case "t_bill", "t_note", "t_bond", "treasury_bill", "treasury_note", "treasury_bond", "tips":
		return "treasury"
	case "debt", "fixed_income", "fixed_income_security", "fixed_income_securities":
		return "bond"
	case "corp_bond", "corporate_debt":
		return "corporate_bond"
	case "muni_bond", "municipal_debt":
		return "municipal_bond"
	case "cd", "certificate_deposits", "negotiable_certificate_of_deposit":
		return "certificate_of_deposit"
	case "real_estate_trust", "real_estate_investment_trust", "real_estate_investment_trusts":
		return "reit"
	case "private_equities":
		return "private_equity"
	case "vc", "venture":
		return "venture_capital"
	case "private_credit", "private_debt_instrument":
		return "private_debt"
	case "options":
		return "option"
	case "warrants":
		return "warrant"
	case "futures":
		return "future"
	case "forwards":
		return "forward"
	case "swaps":
		return "swap"
	case "fx", "foreign_exchange", "currency_pair", "currencies":
		return "forex"
	case "commodities":
		return "commodity"
	case "structured_note", "structured_notes":
		return "structured_product"
	case "digital_asset", "digital_assets", "crypto", "cryptos", "coin", "coins", "token", "tokens":
		return "cryptocurrency"
	case "stable_coin", "stable_coins":
		return "stablecoin"
	case "tokenised_asset", "tokenised_assets", "tokenized_assets":
		return "tokenized_asset"
	}
	for _, definition := range assetClassDefinitions {
		if normalized == definition.ID {
			return definition.ID
		}
	}
	return "other"
}

func IsAssetClass(value string) bool {
	normalized := NormalizeAssetClass(value)
	return normalized != "other" || strings.EqualFold(strings.TrimSpace(value), "other")
}

// NormalizeCountryCode accepts every ISO 3166-1 alpha-2 code shape. The
// provider remains the source of truth for whether an instrument is listed in
// a country; this keeps the API from silently excluding smaller markets.
func NormalizeCountryCode(value string) string {
	normalized := strings.ToUpper(strings.TrimSpace(value))
	if !isoAlpha2Pattern.MatchString(normalized) {
		return ""
	}
	return normalized
}

func IsCountryCode(value string) bool {
	return NormalizeCountryCode(value) != ""
}

func NormalizeCurrencyCode(value string) string {
	normalized := strings.ToUpper(strings.TrimSpace(value))
	if len(normalized) != 3 {
		return ""
	}
	for _, char := range normalized {
		if char < 'A' || char > 'Z' {
			return ""
		}
	}
	return normalized
}

func NormalizeRegion(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	normalized = strings.ReplaceAll(normalized, "_", "-")
	switch normalized {
	case "africa", "americas", "asia", "europe", "middle-east", "oceania", "global":
		return normalized
	default:
		return strings.TrimSpace(value)
	}
}

func RegionOptions() []string {
	return []string{"africa", "americas", "asia", "europe", "middle-east", "oceania", "global"}
}
