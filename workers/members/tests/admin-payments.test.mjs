import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/jwt.js";
import { handleAdmin } from "../src/routes/admin.js";

const originalFetch = global.fetch;

global.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  if (url.includes("/v1/oauth2/token")) {
    return new Response(JSON.stringify({ access_token: "token" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (url.includes("/v1/reporting/transactions")) {
    return new Response(
      JSON.stringify({
        name: "NOT_AUTHORIZED",
        message: "Authorization failed due to insufficient permissions.",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  return new Response("not found", { status: 404 });
};

const secret = "test-secret";
const token = await createSessionToken({ userId: "user-1" }, secret);
const db = {
  prepare(sql) {
    return {
      bind() {
        return {
          async first() {
            if (sql.includes("FROM admin_users")) {
              return { user_id: "user-1", role: "admin" };
            }
            return null;
          },
          async all() {
            if (sql.includes("FROM orders")) {
              return {
                results: [
                  {
                    id: "order-1",
                    paypal_capture_id: "cap-1",
                    paypal_order_id: "pp-1",
                    created_at: "2025-12-01T00:00:00.000Z",
                  },
                ],
              };
            }
            return { results: [] };
          },
        };
      },
    };
  },
};

const request = new Request("https://members.chinamedicaltour.org/api/admin/payments", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`,
  },
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
const data = await response.json();
assert.equal(data.ok, true);
assert.equal(data.paypal.error, "not_authorized");
assert.equal(data.paypal.transactions.length, 0);

global.fetch = originalFetch;
