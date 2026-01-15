import assert from "node:assert/strict";
import { handlePaypal } from "../src/routes/paypal.js";

let updatedStatus = null;

const db = {
  prepare(sql) {
    return {
      bind(...args) {
        return {
          async first() {
            if (sql.includes("FROM webhook_events")) {
              return null;
            }
            if (sql.includes("FROM orders WHERE id = ?")) {
              return {
                id: "order-1",
                user_id: "user-1",
                amount_paid: 9900,
                currency: "USD",
              };
            }
            if (sql.includes("FROM user_profiles")) {
              return { user_id: "user-1" };
            }
            return null;
          },
          async run() {
            if (sql.startsWith("UPDATE orders SET paypal_order_id")) {
              updatedStatus = args[3];
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
  event_type: "PAYMENT.CAPTURE.COMPLETED",
  resource: {
    id: "cap-1",
    custom_id: "order-1",
    amount: { value: "99.00", currency_code: "USD" },
  },
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
assert.equal(updatedStatus, "paid");

global.fetch = originalFetch;
