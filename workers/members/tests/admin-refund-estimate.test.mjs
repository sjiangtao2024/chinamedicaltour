import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/jwt.js";
import { handleAdmin } from "../src/routes/admin.js";

const secret = "test-secret";
const token = await createSessionToken({ userId: "admin-user" }, secret);

const orderRow = {
  id: "order-1",
  user_id: "user-1",
  amount_paid: 10000,
  amount_refunded: 0,
  payment_gateway_fee: 500,
  refund_policy_type: "STANDARD",
  service_start_date: "2099-01-01T00:00:00.000Z",
  currency: "USD",
};

const db = {
  prepare(sql) {
    return {
      bind() {
        return {
          async first() {
            if (sql.includes("FROM admin_users")) {
              return { user_id: "admin-user", role: "admin" };
            }
            if (sql.includes("FROM orders WHERE id = ?")) {
              return orderRow;
            }
            return null;
          },
        };
      },
      async first() {
        if (sql.includes("FROM admin_users")) {
          return { user_id: "admin-user", role: "admin" };
        }
        return null;
      },
    };
  },
};

const request = new Request(
  "https://members.chinamedicaltour.org/api/admin/orders/order-1/refund-estimate",
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const response = await handleAdmin({
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
const payload = await response.json();
assert.equal(payload.ok, true);
assert.equal(payload.refund.refundable_amount, 8550);
assert.equal(payload.refund.amount_refunded, 0);
