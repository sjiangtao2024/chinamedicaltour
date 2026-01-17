import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/jwt.js";
import { handleAdmin } from "../src/routes/admin.js";

const secret = "test-secret";
const token = await createSessionToken({ userId: "admin-1" }, secret);

let amountRefunded = 0;
let orderStatus = "paid";
let serviceStatus = "awaiting_customer";
let insertedRefund = null;

const orderRow = () => ({
  id: "order-1",
  user_id: "user-1",
  amount_paid: 10000,
  amount_refunded: amountRefunded,
  currency: "USD",
  status: orderStatus,
  service_status: serviceStatus,
  paypal_capture_id: "capture-123",
});

const db = {
  prepare(sql) {
    return {
      bind(...args) {
        return {
          async first() {
            if (sql.includes("FROM admin_users")) {
              return { id: "admin-1", user_id: "admin-1" };
            }
            if (sql.includes("FROM orders WHERE id = ?")) {
              return orderRow();
            }
            return null;
          },
          async run() {
            if (sql.startsWith("UPDATE orders SET amount_refunded")) {
              amountRefunded = args[0];
              orderStatus = args[1];
              if (sql.includes("service_status = NULL")) {
                serviceStatus = null;
              }
            }
            if (sql.startsWith("INSERT INTO payment_refunds")) {
              insertedRefund = {
                order_id: args[1],
                amount: args[3],
                gateway_refund_id: args[6],
              };
            }
            return { success: true };
          },
        };
      },
    };
  },
};

const fetchMock = () =>
  Promise.resolve(
    new Response(
      JSON.stringify({ id: "refund-123", status: "COMPLETED" }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    )
  );

const originalFetch = global.fetch;
global.fetch = fetchMock;

const request = new Request("https://members.chinamedicaltour.org/api/admin/orders/order-1/refund", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ amount: 5000, reason: "test" }),
});

const response = await handleAdmin({
  request,
  env: {
    MEMBERS_DB: db,
    JWT_SECRET: secret,
    PAYPAL_CLIENT_ID: "client",
    PAYPAL_SECRET: "secret",
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
assert.equal(payload.order.amount_refunded, 5000);
assert.equal(payload.order.service_status, null);
assert.equal(insertedRefund.gateway_refund_id, "refund-123");

global.fetch = originalFetch;
