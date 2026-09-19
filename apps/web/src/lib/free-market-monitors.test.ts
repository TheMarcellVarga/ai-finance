import assert from "node:assert/strict";
import test from "node:test";

process.env.FINANCE_API_BASE_URL = "http://127.0.0.1:9";

const originalFetch = globalThis.fetch;

function yahooFixture() {
  const now = Math.floor(Date.now() / 1000);
  const timestamp = Array.from({ length: 160 }, (_, index) => now - (159 - index) * 86400);
  const close = timestamp.map((_, index) => 90 + index * 0.08 + Math.sin(index / 4) * 2);
  const open = close.map((value, index) => index === 0 ? value : close[index - 1]);
  return {
    chart: {
      result: [{
        meta: { currency: "USD", symbol: "AAPL", exchangeName: "NMS", regularMarketPrice: close.at(-1), regularMarketTime: now, chartPreviousClose: close.at(-2) },
        timestamp,
        indicators: { quote: [{ open, high: close.map((value) => value + 1.5), low: close.map((value) => value - 1.5), close, volume: close.map((_, index) => 1_000 + index) }] },
      }],
    },
  };
}

test.after(() => {
  globalThis.fetch = originalFetch;
});

test("falls back to free Yahoo data when the Go finance API is unavailable", async () => {
  const { loadFreeAssetMonitor } = await import("./finance-api");
  globalThis.fetch = async (input) => {
    const endpoint = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (endpoint.startsWith("http://127.0.0.1:9")) throw new Error("finance API unavailable");
    return new Response(JSON.stringify(yahooFixture()), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const result = await loadFreeAssetMonitor("equities");
  assert.equal(result.data.length, 9);
  assert.equal(result.data[0].symbol, "AAPL");
  assert.equal(result.meta.provider, "yahoo");
  assert.match(result.meta.providerLabel, /direct BFF fallback/);
  assert.equal(result.meta.freeApi, true);
  assert.equal(result.meta.interval, "1d");
  assert.equal(result.data[0].signalBasis, "ohlc");
  assert.ok(result.data[0].trend === "bullish" || result.data[0].trend === "bearish");
  assert.equal(typeof result.data[0].nextFlipLevel, "number");
  assert.equal(typeof result.data[0].distanceToFlipPercent, "number");
  assert.ok(Math.abs(result.data[0].dailyChangePercent) < 10, "24h change uses the adjacent closed observation, not the range-start close");
});
