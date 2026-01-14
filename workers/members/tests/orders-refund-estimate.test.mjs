import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/jwt.js";
import { handleOrders } from "../src/routes/orders.js";

const secret = "test-secret";
const token = await createSessionToken({ userId: "user-1" }, secret);

const orderRow = {
  id: "order-1",
  user_id: "user-1",
  amount_paid: 10000,
  payment_gateway_fee: 500,
  refund_policy_type: "STANDARD",
  service_start_date: "2026-02-01T12:00:00Z",
};

const db = {
  prepare(sql) {
    return {
      bind() {
        return {
          async first() {
            if (sql.includes("FROM orders WHERE id = ? AND user_id = ?")) {
              return orderRow;
            }
            return null;
          },
        };
      },
    };
  },
};

const request = new Request("https://members.chinamedicaltour.org/api/orders/order-1/refund-estimate", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const response = await handleOrders({
  request,
  env: { MEMBERS_DB: db, JWT_SECRET: secret },
  url: new URL(request.url),
  respond: (status, payload) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
});

assert.equal(response.status, 200);
const payload = await response.json();
assert.equal(payload.ok, true);
assert.equal(payload.refund.refundable_amount, 8550);
