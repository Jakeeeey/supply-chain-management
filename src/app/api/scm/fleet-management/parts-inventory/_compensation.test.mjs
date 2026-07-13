import assert from "node:assert/strict";
import test from "node:test";
import { CompensationFailure, CompensationStack } from "./_compensation.ts";

test("restores stock before deleting dependent audit records", async () => {
  const events = [];
  const originalError = new Error("operation failed");
  const stack = new CompensationStack();

  stack.beginStockRollback("restore stock", async () => events.push("stock"), {
    collection: "fleet_part_stock",
    id: 1,
  });
  stack.add("delete movement", async () => events.push("movement"), {
    collection: "fleet_part_movements",
    id: 2,
  });

  await assert.rejects(stack.compensate(originalError), (error) => error === originalError);
  assert.deepEqual(events, ["stock", "movement"]);
});

test("preserves dependent records when stock restoration conflicts", async () => {
  let movementDeleted = false;
  const stack = new CompensationStack();

  stack.beginStockRollback("restore stock", async () => {
    throw new Error("revision conflict");
  }, { collection: "fleet_part_stock", id: 1 });
  stack.add("delete movement", async () => {
    movementDeleted = true;
  }, { collection: "fleet_part_movements", id: 2 });

  await assert.rejects(stack.compensate(new Error("operation failed")), (error) => {
    assert.ok(error instanceof CompensationFailure);
    assert.deepEqual(error.preservedRecords, [
      { collection: "fleet_part_stock", id: 1 },
      { collection: "fleet_part_movements", id: 2 },
    ]);
    return true;
  });
  assert.equal(movementDeleted, false);
});

test("cleans successful stock groups while preserving conflicted groups and globals", async () => {
  const events = [];
  const stack = new CompensationStack();

  stack.add("delete part", async () => events.push("part"), { collection: "fleet_parts", id: 10 });
  stack.beginStockRollback("restore first stock", async () => events.push("stock-1"), {
    collection: "fleet_part_stock",
    id: 11,
  });
  stack.add("delete first movement", async () => events.push("movement-1"), {
    collection: "fleet_part_movements",
    id: 12,
  });
  stack.beginStockRollback("restore second stock", async () => {
    events.push("stock-2");
    throw new Error("revision conflict");
  }, { collection: "fleet_part_stock", id: 13 });
  stack.add("delete second movement", async () => events.push("movement-2"), {
    collection: "fleet_part_movements",
    id: 14,
  });

  await assert.rejects(stack.compensate(new Error("operation failed")), CompensationFailure);
  assert.deepEqual(events, ["stock-2", "stock-1", "movement-1"]);
});

test("retains new stock rows and parent records after successful stock restoration", async () => {
  const events = [];
  const stack = new CompensationStack();

  stack.add("delete part", async () => events.push("part"), { collection: "fleet_parts", id: 20 });
  stack.recordCreatedStock({ collection: "fleet_part_stock", id: 21 });
  stack.beginStockRollback("restore stock", async () => events.push("stock"), {
    collection: "fleet_part_stock",
    id: 21,
  });
  stack.add("delete movement", async () => events.push("movement"), {
    collection: "fleet_part_movements",
    id: 22,
  });

  await assert.rejects(stack.compensate(new Error("operation failed")), (error) => {
    assert.ok(error instanceof CompensationFailure);
    assert.deepEqual(error.preservedRecords, [
      { collection: "fleet_parts", id: 20 },
      { collection: "fleet_part_stock", id: 21 },
    ]);
    return true;
  });
  assert.deepEqual(events, ["stock", "movement"]);
});

test("keeps reverse rollback order for operations without stock mutations", async () => {
  const events = [];
  const originalError = new Error("operation failed");
  const stack = new CompensationStack();

  stack.add("first", async () => events.push("first"));
  stack.add("second", async () => events.push("second"));

  await assert.rejects(stack.compensate(originalError), (error) => error === originalError);
  assert.deepEqual(events, ["second", "first"]);
});
