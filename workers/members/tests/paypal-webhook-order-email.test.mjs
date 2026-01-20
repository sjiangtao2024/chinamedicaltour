import assert from "node:assert/strict";
import { handlePaypal } from "../src/routes/paypal.js";

let resendCalled = false;
let resendPayload = null;

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
                item_type: "package",
                item_id: "full-body",
                service_status: "pending_contact",
              };
            }
            if (sql.includes("FROM users") && sql.includes("LEFT JOIN user_profiles")) {
              return { email: "jane@example.com", name: "Jane Doe" };
            }
            if (sql.includes("FROM service_products")) {
              return { name: "Full Body Scan" };
            }
            return null;
          },
          async run() {
            return { success: true };
          },
        };
      },
    };
  },
};

const fetchMock = async (input, init) => {
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
  if (url === "https://api.resend.com/emails") {
    resendCalled = true;
    resendPayload = JSON.parse(init.body);
    return new Response("ok", { status: 200 });
  }
  return new Response("not found", { status: 404 });
};

const originalFetch = global.fetch;
global.fetch = fetchMock;

const event = {
  id: "evt-email-1",
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
    RESEND_API_KEY: "resend",
    ORDER_FROM_EMAIL: "orders@chinamedicaltour.org",
    MAIL_FROM_NAME: "CMT Care Team",
    MEMBER_PORTAL_URL: "https://chinamedicaltour.org",
    SUPPORT_EMAIL: "support@chinamedicaltour.org",
    ORDER_BCC_EMAIL: "info@chinamedicaltour.org",
  },
  url: new URL(request.url),
  respond: (status, payload) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
});

assert.equal(response.status, 200);
assert.equal(resendCalled, true);
assert.equal(resendPayload?.bcc, "info@chinamedicaltour.org");

global.fetch = originalFetch;
