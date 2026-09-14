import assert from "node:assert/strict";
import test from "node:test";

process.env.FINANCE_API_BASE_URL = "http://127.0.0.1:9";

const originalFetch = globalThis.fetch;

function yahooFixture() {
  const now = Math.floor(Date.now() / 1000);
  return {
    chart: {
      result: [{
        meta: { currency: "USD", symbol: "AAPL", exchangeName: "NMS", regularMarketPrice: 101, regularMarketTime: now, chartPreviousClose: 100 },
        timestamp: [now - 172800, now - 86400, now],
        indicators: { quote: [{ close: [98, 100, 101], volume: [10, 20, 30] }] },
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
});
