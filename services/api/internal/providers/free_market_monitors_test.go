package providers

import (
	"context"
	"io"
	"math"
	"net/http"
	"strings"
	"testing"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return fn(request)
}

func TestFreeMarketMonitorNormalizesYahooHistory(t *testing.T) {
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		if !strings.Contains(request.URL.Host, "yahoo.com") {
			t.Fatalf("expected Yahoo request, got %s", request.URL)
		}
		body := `{"chart":{"result":[{"meta":{"currency":"USD","symbol":"AAPL","exchangeName":"NMS","regularMarketPrice":11,"regularMarketTime":1789380000,"chartPreviousClose":10},"timestamp":[1789200000,1789290000,1789380000],"indicators":{"quote":[{"close":[10,10.5,11],"volume":[100,200,300]}]}}]}}`
		return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(body)), Header: make(http.Header)}, nil
	})}

	row, err := (FreeMarketMonitorProvider{Client: client}).fetchYahooInstrument(context.Background(), monitorInstrument{Symbol: "AAPL", Name: "Apple", Currency: "USD"})
	if err != nil {
		t.Fatal(err)
	}
	if row.Symbol != "AAPL" || row.DisplayValue != "$11.00" || math.Abs(row.DailyChangePercent-4.7619047619) > 0.0001 {
		t.Fatalf("unexpected normalized row: %#v", row)
	}
	if len(row.Sparkline) != 3 || row.Provider != "free-yahoo" {
		t.Fatalf("expected public history metadata, got %#v", row)
	}
}

func TestFreeMarketMonitorLoadsFrankfurterReferenceRates(t *testing.T) {
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		if !strings.Contains(request.URL.Host, "frankfurter.dev") {
			t.Fatalf("expected Frankfurter request, got %s", request.URL)
		}
		body := `{"base":"USD","rates":{"2026-09-10":{"EUR":0.85,"JPY":153},"2026-09-11":{"EUR":0.86,"JPY":154}}}`
		return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(strings.NewReader(body)), Header: make(http.Header)}, nil
	})}

	payload, err := (FreeMarketMonitorProvider{Client: client}).LoadMarketMonitor(context.Background(), "currencies")
	if err != nil {
		t.Fatal(err)
	}
	if payload.Meta.Provider != "frankfurter" || payload.Meta.FreeAPI != true || len(payload.Data) != 2 {
		t.Fatalf("unexpected currency monitor metadata: %#v", payload.Meta)
	}
	if payload.Data[0].DisplayValue != "0.86000 EUR per USD" || payload.Data[0].DailyChangePercent < 1.1 || payload.Data[0].DailyChangePercent > 1.2 {
		t.Fatalf("unexpected currency normalization: %#v", payload.Data[0])
	}
}
