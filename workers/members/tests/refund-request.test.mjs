import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/jwt.js";
import { handleOrders } from "../src/routes/orders.js";

const secret = "test-secret";
const token = await createSessionToken({ userId: "user-1" }, secret);

let orderStatus = "paid";
let refundStatus = "pending";
let refundPolicyType = "STANDARD";
let deliveryStatus = "PENDING";
let deliveredAt = null;
let serviceStartDate = "2099-01-01T00:00:00.000Z";
const orderId = "order-456";

const orderRow = () => ({
  id: orderId,
  user_id: "user-1",
  item_type: "package",
  item_id: "full-body",
  amount_paid: 80000,
  payment_gateway_fee: 0,
  currency: "USD",
  status: orderStatus,
  refund_policy_type: refundPolicyType,
  service_start_date: serviceStartDate,
  delivery_status: deliveryStatus,
  delivered_at: deliveredAt,
  created_at: "2025-01-01T00:00:00.000Z",
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
            if (sql.includes("FROM refund_requests")) {
              return null;
            }
            return null;
          },
          async run() {
            if (sql.startsWith("UPDATE orders SET status")) {
              orderStatus = args[0];
            }
            if (sql.startsWith("INSERT INTO refund_requests")) {
              refundStatus = "pending";
            }
            return { success: true };
          },
        };
      },
    };
  },
};

const request = new Request(`https://members.chinamedicaltour.org/api/orders/${orderId}/refund-request`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ reason: "Need to reschedule" }),
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

assert.equal(response.status, 201);
const data = await response.json();
assert.equal(data.ok, true);
assert.equal(data.order.status, "refund_requested");
assert.equal(data.refund_request.status, "pending");

orderStatus = "awaiting_payment";
const secondRequest = new Request(
  `https://members.chinamedicaltour.org/api/orders/${orderId}/refund-request`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason: "Need to reschedule" }),
  }
);
const secondResponse = await handleOrders({
  request: secondRequest,
  env: {
    MEMBERS_DB: db,
    JWT_SECRET: secret,
  },
  url: new URL(secondRequest.url),
  respond: (status, payload) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
});

assert.equal(secondResponse.status, 400);
const errorPayload = await secondResponse.json();
assert.equal(errorPayload.error, "refund_not_allowed");

orderStatus = "paid";
refundPolicyType = "INTELLECTUAL";
deliveryStatus = "DELIVERED";
deliveredAt = "2025-01-02T00:00:00.000Z";
const thirdRequest = new Request(
  `https://members.chinamedicaltour.org/api/orders/${orderId}/refund-request`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason: "Need to reschedule" }),
  }
);
const thirdResponse = await handleOrders({
  request: thirdRequest,
  env: {
    MEMBERS_DB: db,
    JWT_SECRET: secret,
  },
  url: new URL(thirdRequest.url),
  respond: (status, payload) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
});

assert.equal(thirdResponse.status, 400);
const thirdPayload = await thirdResponse.json();
assert.equal(thirdPayload.error, "refund_not_allowed");
