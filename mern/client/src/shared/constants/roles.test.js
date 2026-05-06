import assert from "node:assert/strict";
import test from "node:test";
import { getNavItems, ROLES } from "./roles.js";

function labelsFor(role) {
  return getNavItems(role).map((item) => item.label);
}

test("Finance Admin navigation is finance-only for data entry", () => {
  const labels = labelsFor(ROLES.FINANCE_ADMIN);

  assert.ok(labels.includes("Finance"));
  assert.ok(labels.includes("Reports"));
  assert.ok(!labels.includes("Operations"));
  assert.ok(!labels.includes("Weekly Records"));
  assert.ok(!labels.includes("Buscells"));
});

test("Ecclesia Leader navigation keeps attendance and weekly record workflows out of finance", () => {
  const labels = labelsFor(ROLES.ECCLESIA_LEADER);

  assert.ok(labels.includes("Operations"));
  assert.ok(labels.includes("Weekly Records"));
  assert.ok(labels.includes("Members"));
  assert.ok(!labels.includes("Finance"));
  assert.ok(!labels.includes("Reports"));
});

test("Super and Branch Admin retain records visibility without finance data-entry navigation", () => {
  for (const role of [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN]) {
    const labels = labelsFor(role);

    assert.ok(labels.includes("Weekly Records"));
    assert.ok(labels.includes("Reports"));
    assert.ok(!labels.includes("Finance"));
    assert.ok(!labels.includes("Operations"));
  }
});
