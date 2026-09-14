package assets

import "testing"

func TestNormalizeAssetClassCoversProviderAliases(t *testing.T) {
	tests := map[string]string{
		"stock":                        "equity",
		"ETF":                          "etf",
		"mutual fund":                  "mutual_fund",
		"government bond":              "government_bond",
		"T-Bill":                       "treasury",
		"real estate investment trust": "reit",
		"REIT":                         "reit",
		"options":                      "option",
		"futures":                      "future",
		"FX":                           "forex",
		"crypto":                       "cryptocurrency",
		"stable coin":                  "stablecoin",
		"tokenised_asset":              "tokenized_asset",
	}
	for input, expected := range tests {
		if got := NormalizeAssetClass(input); got != expected {
			t.Errorf("NormalizeAssetClass(%q) = %q, want %q", input, got, expected)
		}
	}
}

func TestNormalizeCountryCodeDoesNotRestrictMarketSize(t *testing.T) {
	for _, code := range []string{"US", "JP", "GB", "IN", "BR", "ZA", "SG", "AE", "NZ", "HK"} {
		if got := NormalizeCountryCode(code); got != code {
			t.Errorf("NormalizeCountryCode(%q) = %q", code, got)
		}
	}
	for _, code := range []string{"USA", "U", "United States", "", "1A"} {
		if got := NormalizeCountryCode(code); got != "" {
			t.Errorf("NormalizeCountryCode(%q) = %q, want empty", code, got)
		}
	}
}

func TestAssetClassesAreBroadAndStable(t *testing.T) {
	classes := AssetClasses()
	if len(classes) < 30 {
		t.Fatalf("expected broad asset catalog, got %d classes", len(classes))
	}
	for _, required := range []string{"equity", "etf", "bond", "mutual_fund", "option", "future", "forex", "commodity", "cryptocurrency", "other"} {
		found := false
		for _, class := range classes {
			if class.ID == required {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("asset catalog is missing %q", required)
		}
	}
}
