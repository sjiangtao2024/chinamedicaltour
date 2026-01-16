import test from "node:test";
import assert from "node:assert/strict";
import { findAdminOrderDetails, listAdminOrders } from "../lib/admin.js";

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
              all() {
                return { results: [] };
              },
              first() {
                return undefined;
              },
            };
          },
        };
      },
    },
  };
};

test("listAdminOrders selects extended admin fields", async () => {
  const { db, calls } = createDbSpy();

  const result = await listAdminOrders(db, { limit: 25 });

  assert.equal(Array.isArray(result.results), true);
  assert.equal(calls.length, 1);
  const { query, binds } = calls[0];
  assert.ok(query.includes("orders.updated_at"));
  assert.ok(query.includes("orders.payment_channel"));
  assert.ok(query.includes("orders.transaction_id"));
  assert.ok(query.includes("orders.service_status"));
  assert.ok(query.includes("AS contact_info"));
  assert.ok(query.includes("AS payment_channel"));
  assert.ok(query.includes("AS transaction_id"));
  assert.equal(binds[binds.length - 1], 25);
});

test("findAdminOrderDetails joins profile contact info", async () => {
  const { db, calls } = createDbSpy();

  const result = await findAdminOrderDetails(db, "order-1");

  assert.equal(result, undefined);
  assert.equal(calls.length, 1);
  const { query, binds } = calls[0];
  assert.ok(query.includes("orders.payment_channel"));
  assert.ok(query.includes("orders.transaction_id"));
  assert.ok(query.includes("orders.service_status"));
  assert.ok(query.includes("order_profiles"));
  assert.ok(query.includes("travel_date"));
  assert.ok(query.includes("travel_group_size"));
  assert.ok(query.includes("nationality"));
  assert.ok(query.includes("AS contact_info"));
  assert.ok(query.includes("AS user_email"));
  assert.ok(query.includes("AS user_name"));
  assert.ok(query.includes("AS payment_channel"));
  assert.ok(query.includes("AS transaction_id"));
  assert.equal(binds[0], "order-1");
});
