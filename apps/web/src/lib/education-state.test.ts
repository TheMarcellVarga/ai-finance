import test from "node:test";
import assert from "node:assert/strict";

import { getEducationStorageKey, parseEducationState } from "./education-state";

test("education storage is isolated by authenticated account", () => {
  assert.notEqual(getEducationStorageKey("user-a"), getEducationStorageKey("user-b"));
  assert.match(getEducationStorageKey("user-a"), /account\.user-a$/);
});

test("legacy boolean audit states migrate to explicit evidence statuses", () => {
  const state = parseEducationState(JSON.stringify({ backtestAudit: { universeAndDates: true, pointInTimeData: false, limitations: "Known gap" } }));
  assert.equal(state.backtestAudit?.universeAndDates, "confirmed");
  assert.equal(state.backtestAudit?.pointInTimeData, "missing");
  assert.equal(state.backtestAudit?.outOfSample, "unknown");
});

test("malformed state degrades to an empty bounded record", () => {
  const state = parseEducationState("not-json");
  assert.deepEqual(state.strategySpecifications, []);
  assert.deepEqual(state.constitutionVersions, []);
  assert.deepEqual(state.journalEntries, []);
});
