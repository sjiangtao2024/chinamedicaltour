import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/jwt.js";
import { handlePaypal } from "../src/routes/paypal.js";

let updatedStatus = null;
let updatedPaypalOrderId = null;

const db = {
  prepare(sql) {
    return {
      bind(...args) {
        return {
          async first() {
            if (sql.includes("FROM orders WHERE id = ?")) {
              return {
                id: "order-1",
                user_id: "user-1",
                amount_paid: 9900,
                currency: "USD",
                paypal_order_id: "pp-order-1",
              };
            }
            return null;
          },
          async run() {
            if (sql.startsWith("UPDATE orders SET paypal_order_id")) {
              updatedPaypalOrderId = args[0];
              updatedStatus = args[6];
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
  if (url.includes("/v2/checkout/orders/") && url.endsWith("/capture")) {
    return new Response(
      JSON.stringify({
        status: "COMPLETED",
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: "cap-1",
                  amount: { value: "99.00", currency_code: "USD" },
                  seller_receivable_breakdown: {
                    paypal_fee: { value: "3.67" },
                  },
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
  return new Response("not found", { status: 404 });
};

const originalFetch = global.fetch;
global.fetch = fetchMock;

const secret = "test-secret";
const token = await createSessionToken({ userId: "user-1" }, secret);
const request = new Request("https://members.chinamedicaltour.org/api/paypal/capture", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ order_id: "order-1" }),
});

const response = await handlePaypal({
  request,
  env: {
    MEMBERS_DB: db,
    PAYPAL_CLIENT_ID: "client",
    PAYPAL_SECRET: "secret",
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
assert.equal(updatedStatus, "awaiting_capture");
assert.equal(updatedPaypalOrderId, "pp-order-1");

global.fetch = originalFetch;
