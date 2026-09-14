import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getTradingViewChartUrl } from "../lib/tradingview-url";

describe("getTradingViewChartUrl", () => {
  it("opens the selected exchange pair in TradingView chart view", () => {
    assert.equal(
      getTradingViewChartUrl("BINANCE:LSKUSDT"),
      "https://www.tradingview.com/chart/?symbol=BINANCE%3ALSKUSDT",
    );
  });
});
