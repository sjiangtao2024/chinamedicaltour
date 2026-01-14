import assert from "node:assert/strict";
import { handlePaypal } from "../src/routes/paypal.js";

let orderStatus = null;
let amountRefunded = null;
let refundStatus = null;

const db = {
  prepare(sql) {
    return {
      bind(...args) {
        return {
          async first() {
            if (sql.includes("FROM webhook_events")) {
              return null;
            }
            if (sql.includes("FROM payment_refunds WHERE gateway_refund_id")) {
              return { order_id: "order-1", amount: 10000 };
            }
            if (sql.includes("SUM(amount)")) {
              return { total: 10000 };
            }
            if (sql.includes("FROM orders WHERE id = ?")) {
              return { id: "order-1", amount_paid: 10000 };
            }
            return null;
          },
          async run() {
            if (sql.startsWith("UPDATE orders SET amount_refunded")) {
              amountRefunded = args[0];
              orderStatus = args[1];
            }
            if (sql.startsWith("UPDATE payment_refunds SET status")) {
              refundStatus = args[0];
            }
            return { success: true };
          },
        };
      },
    };
  },
};

const fetchMock = async (input) => {
  const url = typeof input === "string" ? input : input.url;
  if (url.endsWith("/v1/oauth2/token")) {
    return new Response(JSON.stringify({ access_token: "token" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (url.endsWith("/v1/notifications/verify-webhook-signature")) {
    return new Response(JSON.stringify({ verification_status: "SUCCESS" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response("not found", { status: 404 });
};

const originalFetch = global.fetch;
global.fetch = fetchMock;

const event = {
  id: "evt-1",
  event_type: "PAYMENT.CAPTURE.REFUNDED",
  resource: { id: "refund-123", status: "COMPLETED" },
};

const request = new Request("https://members.chinamedicaltour.org/api/paypal/webhook", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "paypal-auth-algo": "algo",
    "paypal-cert-url": "cert",
    "paypal-transmission-id": "tx",
    "paypal-transmission-sig": "sig",
    "paypal-transmission-time": "time",
  },
  body: JSON.stringify(event),
});

const response = await handlePaypal({
  request,
  env: {
    MEMBERS_DB: db,
    PAYPAL_CLIENT_ID: "client",
    PAYPAL_SECRET: "secret",
    PAYPAL_WEBHOOK_ID: "wh",
  },
  url: new URL(request.url),
  respond: (status, payload) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
});

assert.equal(response.status, 200);
assert.equal(orderStatus, "refunded");
assert.equal(amountRefunded, 10000);
assert.equal(refundStatus, "COMPLETED");

global.fetch = originalFetch;
