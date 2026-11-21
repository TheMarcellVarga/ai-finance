import assert from "node:assert/strict";
import test from "node:test";
import { countryCodeForMap, countryRegion, globeAnnotationItems, groupGeography } from "./investment-globe-data";
import type { GeographyItem } from "./investment-geography";

test("regional navigation uses country codes, including aliases and Pacific territories", () => {
  assert.equal(countryRegion("US"), "americas");
  assert.equal(countryRegion("UK"), "europe");
  assert.equal(countryRegion("EL"), "europe");
  assert.equal(countryRegion("SG"), "asia-pacific");
  assert.equal(countryRegion("PF"), "asia-pacific");
  assert.equal(countryRegion("ZA"), "africa-middle-east");
  assert.equal(countryRegion("AE"), "africa-middle-east");
  assert.equal(countryRegion("ZZ"), undefined);
});

test("country, cross-border, and absent metadata reconcile without false pins", () => {
  const base = { basis: "Test provider metadata" };
  const items: GeographyItem[] = [
    { ...base, id: "one", label: "One", scope: "country", countryCode: "UK", value: 20 },
    { ...base, id: "two", label: "Two", scope: "country", countryCode: "GB", value: 30 },
    { ...base, id: "crypto", label: "Crypto", scope: "global", countryCode: "US", value: 10 },
    { ...base, id: "invalid", label: "Invalid", scope: "country", countryCode: "ZZ", value: 15 },
    { ...base, id: "absent", label: "Absent", scope: "unattributed", value: 25 },
  ];
  const groups = groupGeography(items);
  assert.equal(groups.length, 3);
  assert.equal(groups.find((group) => group.id === "GB")?.value, 50);
  assert.equal(groups.find((group) => group.id === "unattributed")?.value, 40);
  assert.equal(groups.find((group) => group.id === "global")?.countryCode, undefined);
  assert.equal(groups.reduce((sum, group) => sum + group.value, 0), 100);
  assert.deepEqual(groups.flatMap((group) => group.items.map((item) => item.id)).sort(), items.map((item) => item.id).sort());
  assert.deepEqual(groupGeography([]), []);
});

test("map names resolve to provider country codes without merging disputed map features", () => {
  assert.equal(countryCodeForMap("United States of America"), "US");
  assert.equal(countryCodeForMap("Japan"), "JP");
  assert.equal(countryCodeForMap("Taiwan"), "TW");
  assert.equal(countryCodeForMap("S. Sudan"), "SS");
  assert.equal(countryCodeForMap("N. Cyprus"), undefined);
  assert.equal(countryCodeForMap("Somaliland"), undefined);
});


test("floating annotations include the selected asset even late in a large country group", () => {
  const items: GeographyItem[] = Array.from({ length: 250 }, (_, index) => ({ id: `asset-${index}`, label: `Asset ${index}`, scope: "country", countryCode: "US", basis: "Test metadata" }));
  assert.deepEqual(globeAnnotationItems(items, "asset-249").map((item) => item.id), ["asset-249", "asset-0", "asset-1"]);
  assert.equal(items[0].id, "asset-0");
  assert.equal(items[249].id, "asset-249");
});

test("floating annotations keep stable order when selection is absent and handle empty data", () => {
  const items: GeographyItem[] = [{ id: "one", label: "One", scope: "global", basis: "Test metadata" }];
  assert.deepEqual(globeAnnotationItems(items, "not-in-group"), items);
  assert.deepEqual(globeAnnotationItems([]), []);
});
