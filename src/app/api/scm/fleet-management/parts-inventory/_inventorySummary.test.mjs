import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCompatibleVehicleTypeKeys,
  computeSourceFingerprint,
  deriveAllScopeStockStatus,
  deriveBranchScopeStockStatus,
  deriveStockStatus,
  deriveSummaryRows,
  staleSummaryKeys,
  summaryKeyFor,
  worstStockStatus,
} from "./_inventorySummary.ts";

const basePart = {
  id: 42,
  partCode: "FP-001",
  partName: "Oil Filter",
  categoryId: 3,
  categoryName: "Filters",
  unit: "pcs",
  minimumQuantity: 5,
  storageLocation: "A-1",
  description: null,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  deletedAt: null,
};

test("deriveStockStatus matches reorder thresholds", () => {
  assert.equal(deriveStockStatus(0, 5), "out_of_stock");
  assert.equal(deriveStockStatus(3, 5), "low_stock");
  assert.equal(deriveStockStatus(6, 5), "available");
});

test("worstStockStatus prefers out_of_stock over low_stock", () => {
  assert.equal(worstStockStatus(["available", "low_stock", "out_of_stock"]), "out_of_stock");
});

test("deriveAllScopeStockStatus uses worst branch status", () => {
  const status = deriveAllScopeStockStatus(
    [
      { availableQuantity: 20, hasStockRow: true },
      { availableQuantity: 2, hasStockRow: true },
    ],
    5,
  );
  assert.equal(status, "low_stock");
});

test("deriveBranchScopeStockStatus treats missing stock as out of stock", () => {
  assert.equal(deriveBranchScopeStockStatus(0, 5, false), "out_of_stock");
  assert.equal(deriveBranchScopeStockStatus(4, 5, true), "low_stock");
});

test("deriveSummaryRows emits all and branch scoped keys", () => {
  const stockByBranch = new Map([
    [10, {
      stockOnHand: 12,
      reservedQuantity: 2,
      damagedQuantity: 0,
      availableQuantity: 10,
      lastMovementAt: "2026-06-01T00:00:00.000Z",
      stockRevision: 3,
    }],
    [11, {
      stockOnHand: 4,
      reservedQuantity: 0,
      damagedQuantity: 0,
      availableQuantity: 4,
      lastMovementAt: null,
      stockRevision: 1,
    }],
  ]);

  const rows = deriveSummaryRows({
    part: basePart,
    stockByBranch,
    activeBranches: [
      { id: 10, branchName: "Main" },
      { id: 11, branchName: "North" },
    ],
    compatibilityTypeIds: [7, 2],
    stockRowCount: 2,
    fingerprint: "abc",
    syncedAt: "2026-06-09T00:00:00.000Z",
  });

  assert.equal(rows.length, 3);
  assert.equal(rows[0].summary_key, summaryKeyFor("all", 42));
  assert.equal(rows[0].scope, "all");
  assert.equal(rows[0].stock_on_hand, 16);
  assert.equal(rows[0].available_quantity, 14);
  assert.equal(rows[0].stock_status, "low_stock");
  assert.equal(rows[1].summary_key, summaryKeyFor("branch", 42, 10));
  assert.equal(rows[1].stock_status, "available");
  assert.equal(rows[2].summary_key, summaryKeyFor("branch", 42, 11));
  assert.equal(rows[2].stock_status, "low_stock");
  assert.equal(rows[0].compatible_vehicle_type_keys, "|2|7|");
});

test("deriveSummaryRows includes stock outside active branches in all scope", () => {
  const rows = deriveSummaryRows({
    part: basePart,
    stockByBranch: new Map([
      [0, {
        stockOnHand: 7,
        reservedQuantity: 0,
        damagedQuantity: 1,
        availableQuantity: 6,
        lastMovementAt: "2026-06-02T00:00:00.000Z",
        stockRevision: 1,
      }],
    ]),
    activeBranches: [{ id: 10, branchName: "Main" }],
    compatibilityTypeIds: [],
    stockRowCount: 1,
    fingerprint: "abc",
    syncedAt: "2026-06-09T00:00:00.000Z",
  });

  assert.equal(rows[0].stock_on_hand, 7);
  assert.equal(rows[0].damaged_quantity, 1);
  assert.equal(rows[0].available_quantity, 6);
  assert.equal(rows[0].stock_status, "available");
  assert.equal(rows[1].stock_on_hand, 0);
  assert.equal(rows[1].stock_status, "out_of_stock");
});

test("computeSourceFingerprint changes when stock revisions change", () => {
  const stockByBranch = new Map([
    [10, {
      stockOnHand: 5,
      reservedQuantity: 0,
      damagedQuantity: 0,
      availableQuantity: 5,
      lastMovementAt: null,
      stockRevision: 1,
    }],
  ]);
  const base = {
    minimumQuantity: 5,
    isActive: true,
    categoryId: 3,
    partCode: "FP-001",
    partName: "Oil Filter",
    compatibilityTypeIds: [2],
    stockByBranch,
  };
  const first = computeSourceFingerprint(base);
  const second = computeSourceFingerprint({
    ...base,
    stockByBranch: new Map([
      [10, { ...stockByBranch.get(10), stockRevision: 2 }],
    ]),
  });
  assert.notEqual(first, second);
});

test("staleSummaryKeys returns keys not present in expected set", () => {
  const stale = staleSummaryKeys(
    ["42:all", "42:branch:10", "42:branch:99"],
    ["42:all", "42:branch:10"],
  );
  assert.deepEqual(stale, ["42:branch:99"]);
});

test("buildCompatibleVehicleTypeKeys wraps sorted ids", () => {
  assert.equal(buildCompatibleVehicleTypeKeys([9, 2, 9]), "|2|9|");
  assert.equal(buildCompatibleVehicleTypeKeys([]), "");
});
