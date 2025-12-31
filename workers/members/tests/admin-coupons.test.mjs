import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/jwt.js";
import { handleAdmin } from "../src/routes/admin.js";

const secret = "test-secret";
const token = await createSessionToken({ userId: "admin-user" }, secret);

const calls = [];
const db = {
  prepare(sql) {
    return {
      async first() {
        if (sql.includes("FROM admin_users")) {
          return { user_id: "admin-user", role: "admin" };
        }
        if (sql.startsWith("SELECT COUNT")) {
          return { count: 2 };
        }
        return null;
      },
      bind(...args) {
        calls.push({ sql, args });
        return {
          async first() {
            if (sql.includes("FROM admin_users")) {
              return { user_id: "admin-user", role: "admin" };
            }
            if (sql.startsWith("SELECT COUNT")) {
              return { count: 2 };
            }
            return null;
          },
          async all() {
            if (sql.includes("FROM coupons")) {
              return {
                results: [
                  {
                    id: "coupon-1",
                    code: "WINTER",
                    type: "percent",
                    value: 10,
                    ref_channel: "influencer",
                    scope: null,
                    valid_from: "2025-12-01T00:00:00Z",
                    valid_to: "2025-12-31T23:59:59Z",
                    usage_limit: 100,
                    used_count: 2,
                    max_discount: 5000,
                    issuer_name: "Sunny",
                    issuer_contact: "sunny@example.com",
                    created_at: "2025-12-01T00:00:00Z",
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

const request = new Request("https://members.chinamedicaltour.org/api/admin/coupons?limit=20&offset=5", {
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
assert.equal(data.coupons.length, 1);
assert.equal(data.coupons[0].issuer_name, "Sunny");
assert.equal(data.coupons[0].issuer_contact, "sunny@example.com");
assert.equal(data.meta.total, 2);

const listCall = calls.find((call) => call.sql.includes("FROM coupons") && call.sql.includes("LIMIT"));
assert.ok(listCall);
assert.equal(listCall.args.at(-2), 20);
assert.equal(listCall.args.at(-1), 5);
