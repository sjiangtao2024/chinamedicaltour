import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/jwt.js";
import { handleOrders } from "../src/routes/orders.js";

const secret = "test-secret";
const token = await createSessionToken({ userId: "user-1" }, secret);

const db = {
  prepare(sql) {
    return {
      bind(...args) {
        return {
          async first() {
            if (sql.includes("FROM user_profiles")) {
              return { user_id: "user-1" };
            }
            if (sql.includes("FROM orders WHERE idempotency_key")) {
              return null;
            }
            if (sql.includes("FROM orders WHERE user_id = ? AND item_type")) {
              return null;
            }
            if (sql.includes("FROM coupons")) {
              return null;
            }
            if (sql.includes("FROM service_products")) {
              return {
                refund_policy_type: "INTELLECTUAL",
                terms_version: "2026-01-14",
              };
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

const makeRequest = (body) =>
  new Request("https://members.chinamedicaltour.org/api/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

const respond = (status, payload) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

{
  const request = makeRequest({
    item_type: "package",
    item_id: "pre-consultation",
    amount_original: 9900,
    currency: "USD",
    idempotency_key: "idemp-1",
  });
  const response = await handleOrders({
    request,
    env: { MEMBERS_DB: db, JWT_SECRET: secret },
    url: new URL(request.url),
    respond,
  });
  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(payload.error, "terms_required");
}

{
  const request = makeRequest({
    item_type: "package",
    item_id: "pre-consultation",
    amount_original: 9900,
    currency: "USD",
    idempotency_key: "idemp-2",
    terms_version: "2026-01-14",
    terms_agreed_at: "2026-01-14T12:00:00Z",
  });
  const response = await handleOrders({
    request,
    env: { MEMBERS_DB: db, JWT_SECRET: secret },
    url: new URL(request.url),
    respond,
  });
  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(payload.order.refund_policy_type, "INTELLECTUAL");
  assert.equal(payload.order.terms_version, "2026-01-14");
  assert.equal(payload.order.terms_agreed_at, "2026-01-14T12:00:00Z");
}
