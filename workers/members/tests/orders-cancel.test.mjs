import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/jwt.js";
import { handleOrders } from "../src/routes/orders.js";

const secret = "test-secret";
const token = await createSessionToken({ userId: "user-1" }, secret);

let orderStatus = "awaiting_payment";
const orderId = "order-123";
const orderRow = () => ({
  id: orderId,
  user_id: "user-1",
  item_type: "package",
  item_id: "full-body",
  amount_paid: 80000,
  currency: "USD",
  status: orderStatus,
  created_at: new Date().toISOString(),
});

const db = {
  prepare(sql) {
    return {
      bind(...args) {
        return {
          async first() {
            if (sql.includes("FROM orders WHERE id = ? AND user_id = ?")) {
              return orderRow();
            }
            if (sql.includes("FROM orders WHERE id = ?")) {
              return orderRow();
            }
            return null;
          },
          async run() {
            if (sql.startsWith("UPDATE orders SET status")) {
              orderStatus = args[0];
            }
            return { success: true };
          },
        };
      },
    };
  },
};

const request = new Request(`https://members.chinamedicaltour.org/api/orders/${orderId}/cancel`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const response = await handleOrders({
  request,
  env: {
    MEMBERS_DB: db,
    JWT_SECRET: secret,
  },
  url: new URL(request.url),
  respond: (status, payload) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
});

assert.equal(response.status, 200);
const data = await response.json();
assert.equal(data.ok, true);
assert.equal(data.order.status, "cancelled");

orderStatus = "paid";
const secondResponse = await handleOrders({
  request,
  env: {
    MEMBERS_DB: db,
    JWT_SECRET: secret,
  },
  url: new URL(request.url),
  respond: (status, payload) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
});

assert.equal(secondResponse.status, 400);
const errorPayload = await secondResponse.json();
assert.equal(errorPayload.error, "cancel_not_allowed");
