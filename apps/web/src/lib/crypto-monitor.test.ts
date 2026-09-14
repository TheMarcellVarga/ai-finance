import assert from "node:assert/strict";
import test from "node:test";

import { isFlipEligibleBaseAsset, isStablecoinAsset } from "./crypto-market-universe";
import { cryptoMonitorIntervals, normalizeCryptoMonitorInterval } from "./crypto-monitor-intervals";

test("supports the expanded shared Supertrend timeframe set", () => {
  assert.deepEqual(cryptoMonitorIntervals, [
    "1m",
    "3m",
    "5m",
    "15m",
    "30m",
    "1h",
    "2h",
    "4h",
    "6h",
    "12h",
    "1d",
    "3d",
    "1w",
  ]);

  for (const interval of cryptoMonitorIntervals) {
    assert.equal(normalizeCryptoMonitorInterval(interval), interval);
  }
});

test("falls back to the default Supertrend timeframe for unknown values", () => {
  assert.equal(normalizeCryptoMonitorInterval("2w"), "4h");
  assert.equal(normalizeCryptoMonitorInterval(null), "4h");
});

test("recognizes common stablecoin base assets", () => {
  for (const asset of [
    "USDT",
    "USDC",
    "DAI",
    "FDUSD",
    "PYUSD",
    "EURC",
    "EURI",
    "USDe",
    "RLUSD",
    "USDG",
    "USAT",
    "XUSD",
    "BFUSD",
    "KGST",
    "U",
    "AUDF",
    "AUDM",
    "BRL1",
    "PAXG",
    "XAUT",
  ]) {
    assert.equal(isStablecoinAsset(asset), true, asset);
  }
});

test("normalizes stable-value symbols without excluding similar non-stable assets", () => {
  assert.equal(isStablecoinAsset("  usdc  "), true);
  assert.equal(isStablecoinAsset("USD"), false);
  assert.equal(isStablecoinAsset("SOL"), false);
  assert.equal(isStablecoinAsset("XAUT"), true);
});

test("excludes stablecoins before flip calculation while keeping spot assets eligible", () => {
  assert.equal(isFlipEligibleBaseAsset("USDC"), false);
  assert.equal(isFlipEligibleBaseAsset("USDT"), false);
  assert.equal(isFlipEligibleBaseAsset("RLUSD"), false);
  assert.equal(isFlipEligibleBaseAsset("PAXG"), false);
  assert.equal(isFlipEligibleBaseAsset("XAUT"), false);
  assert.equal(isFlipEligibleBaseAsset("SOL"), true);
  assert.equal(isFlipEligibleBaseAsset("BTCUP"), false);
});
