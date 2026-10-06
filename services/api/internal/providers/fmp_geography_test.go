package providers

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"
)

type geographyRoundTripper func(*http.Request) (*http.Response, error)

func (fn geographyRoundTripper) RoundTrip(request *http.Request) (*http.Response, error) {
	return fn(request)
}

func TestFMPQuoteSearchEnrichesMissingCountryFromProfile(t *testing.T) {
	profileCalls := 0
	client := &http.Client{Transport: geographyRoundTripper(func(request *http.Request) (*http.Response, error) {
		body := `[]`
		switch request.URL.Path {
		case "/stable/quote":
			body = `[{"symbol":"ZZGEO","name":"Geography Test","price":10,"exchange":"NASDAQ"}]`
		case "/stable/profile":
			profileCalls++
			body = `[{"symbol":"ZZGEO","country":"JP"}]`
		default:
			t.Fatalf("unexpected endpoint: %s", request.URL.Path)
		}
		return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(body)), Header: make(http.Header)}, nil
	})}
	provider := FMPProvider{APIKey: "test-key", Client: client}
	for range 2 {
		assets, err := provider.SearchAssets(context.Background(), "ZZGEO")
		if err != nil || len(assets) != 1 {
			t.Fatalf("search failed: assets=%v err=%v", assets, err)
		}
		if assets[0].CountryCode != "JP" {
			t.Fatalf("country=%q, want JP", assets[0].CountryCode)
		}
	}
	if profileCalls != 1 {
		t.Fatalf("profile calls=%d, want cached single call", profileCalls)
	}
}

func TestFMPProfileProvidesCountryWhenQuoteEndpointHasNoSymbol(t *testing.T) {
	client := &http.Client{Transport: geographyRoundTripper(func(request *http.Request) (*http.Response, error) {
		body := `[]`
		if request.URL.Path == "/stable/profile" {
			body = `[{"symbol":"ZZFUND","companyName":"Geography Fund","exchangeShortName":"AMEX","country":"US","isEtf":true}]`
		}
		return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(body)), Header: make(http.Header)}, nil
	})}
	assets, err := (FMPProvider{APIKey: "test-key", Client: client}).SearchAssets(context.Background(), "ZZFUND")
	if err != nil || len(assets) != 1 {
		t.Fatalf("profile fallback failed: assets=%v err=%v", assets, err)
	}
	if assets[0].CountryCode != "US" || assets[0].AssetClass != "etf" || assets[0].Provider != "fmp-profile" {
		t.Fatalf("unexpected profile asset: %+v", assets[0])
	}
	if assets[0].PriceCents != 0 {
		t.Fatalf("profile price must not masquerade as a timestamped quote: %+v", assets[0])
	}
}
