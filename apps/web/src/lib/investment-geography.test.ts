import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { assetGeography, countryLocation, geographyLabel, marketGeography } from "./investment-geography";

test("country metadata takes priority over listing geography", () => {
  const asset = assetGeography({ ticker: "ABC", type: "equity", countryCode: "JP", exchange: "NYSE" }, "one", 100);
  assert.equal(asset.countryCode, "JP");
  assert.match(asset.basis, /Provider country metadata/);
  assert.equal(geographyLabel(asset), "Japan · JP");
  assert.equal(countryLocation("TW")?.name, "Taiwan");
  assert.equal(assetGeography({ ticker: "ABC", countryCode: "UK" }, "uk").countryCode, "GB");
});

test("name, ISIN, and reported venue fill country gaps with disclosed bases", () => {
  assert.equal(assetGeography({ ticker: "A", type: "equity", country: "United Kingdom" }, "a").countryCode, "GB");
  assert.match(assetGeography({ ticker: "B", type: "fund", isin: "FR0000000000" }, "b").basis, /ISIN registration/);
  assert.match(assetGeography({ ticker: "C", type: "fund", mic: "XNAS" }, "c").basis, /Listing venue/);
  assert.equal(assetGeography({ ticker: "D.T", type: "equity" }, "d").scope, "unattributed");
  assert.equal(marketGeography({ symbol: "VT", assetClass: "funds", venue: "PCX" }).countryCode, "US");
  assert.equal(marketGeography({ symbol: "RELIANCE.NS", assetClass: "equities", venue: "NSI" }).countryCode, "IN");
});

test("cross-border assets and absent country metadata are both represented without false country pins", () => {
  const crypto = marketGeography({ symbol: "BTC/USDT", assetClass: "crypto" });
  const currency = marketGeography({ symbol: "USD/EUR", assetClass: "currencies" });
  const noCountry = assetGeography({ ticker: "ABC", type: "fund" }, "abc", 25);
  assert.equal(crypto.scope, "global");
  assert.equal(currency.scope, "global");
  assert.equal(noCountry.scope, "unattributed");
  assert.equal(geographyLabel(noCountry), "Country not supplied");
  assert.equal(noCountry.value, 25);
});

test("all fixed monitor categories resolve to a visible geography bucket", () => {
  const examples = [
    { symbol: "TSM", assetClass: "equities", countryCode: "TW" },
    { symbol: "VT", assetClass: "funds", venue: "PCX" },
    { symbol: "^TNX", assetClass: "cash-rates" },
    { symbol: "GC=F", assetClass: "commodities" },
    { symbol: "ES=F", assetClass: "derivatives" },
    { symbol: "BTC/USDT", assetClass: "crypto" },
  ];
  const items = examples.map(marketGeography);
  assert.equal(items.length, examples.length);
  assert.ok(items.every((item) => ["country", "global", "unattributed"].includes(item.scope)));
  assert.equal(items.find((item) => item.label === "VT")?.countryCode, "US");
  assert.equal(items.find((item) => item.label === "^TNX")?.countryCode, "US");
  assert.equal(items.find((item) => item.label === "GC=F")?.scope, "global");
  assert.equal(marketGeography({ symbol: "NEWFUND", assetClass: "funds" }).scope, "unattributed");
});

test("fixed catalog symbols do not acquire unsourced country pins", () => {
  const source = readFileSync(resolve(process.cwd(), "../../services/api/internal/providers/free_market_monitors.go"), "utf8");
  const classes = [...source.matchAll(/\{\s*ID:\s*"([^"]+)"[\s\S]*?Instruments:\s*\[\]monitorInstrument\{([\s\S]*?)\n\s*\},/g)];
  assert.equal(classes.length, 10);
  const records = classes.flatMap(([, assetClass, instruments]) =>
    [...instruments.matchAll(/\{Symbol:\s*"([^"]+)"/g)].map(([, symbol]) => ({ assetClass, symbol })),
  );
  assert.equal(records.length, 78);
  const unsourcedPins = records.map(marketGeography).filter((item) => item.scope === "country" && !/^\^(IRX|FVX|TNX|TYX)$/.test(item.label));
  assert.deepEqual(unsourcedPins, []);
});
