import test from "node:test";
import assert from "node:assert/strict";
import { updateOrderServiceStatus, toOrderSummary } from "../lib/orders.js";

const createDbSpy = () => {
  const calls = [];
  return {
    calls,
    db: {
      prepare(query) {
        const call = { query, binds: [] };
        calls.push(call);
        return {
          bind(...params) {
            call.binds = params;
            return {
              run() {
                return { success: true };
              },
              first() {
                return { id: "order-1", service_status: "contacted" };
              },
            };
          },
        };
      },
    },
  };
};

test("updateOrderServiceStatus persists service status", async () => {
  const { db, calls } = createDbSpy();

  await updateOrderServiceStatus(db, "order-1", "contacted");

  assert.equal(calls.length, 2);
  const updateCall = calls[0];
  assert.ok(updateCall.query.includes("service_status"));
  assert.equal(updateCall.binds[0], "contacted");
  assert.equal(updateCall.binds[updateCall.binds.length - 1], "order-1");
});

test("toOrderSummary includes service status", () => {
  const summary = toOrderSummary({
    id: "order-1",
    item_type: "package",
    item_id: "full-body",
    amount_paid: 80000,
    currency: "USD",
    status: "paid",
    service_status: "pending_contact",
    created_at: "2025-12-31T00:00:00.000Z",
  });

  assert.equal(summary.service_status, "pending_contact");
});
