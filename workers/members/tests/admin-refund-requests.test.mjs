import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/jwt.js";
import { handleAdmin } from "../src/routes/admin.js";

const secret = "test-secret";
const token = await createSessionToken({ userId: "admin-user" }, secret);

let refundStatus = "pending";
let orderStatus = "paid";

const db = {
  prepare(sql) {
    return {
      bind(...args) {
        return {
          async first() {
            if (sql.includes("FROM admin_users")) {
              return { user_id: "admin-user", role: "admin" };
            }
            if (sql.includes("FROM refund_requests")) {
              return {
                id: "refund-1",
                order_id: "order-1",
                user_id: "user-1",
                reason: "Need to reschedule",
                status: refundStatus,
                admin_note: null,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              };
            }
            if (sql.includes("FROM orders WHERE id = ?")) {
              return { id: "order-1", status: orderStatus };
            }
            return null;
          },
          async all() {
            if (sql.includes("FROM refund_requests")) {
              return {
                results: [
                  {
                    id: "refund-1",
                    order_id: "order-1",
                    user_id: "user-1",
                    reason: "Need to reschedule",
                    status: refundStatus,
                    admin_note: null,
                    created_at: "2025-01-01T00:00:00Z",
                    updated_at: "2025-01-01T00:00:00Z",
                  },
                ],
              };
            }
            return { results: [] };
          },
          async run() {
            if (sql.startsWith("UPDATE refund_requests SET status")) {
              refundStatus = args[0];
            }
            if (sql.startsWith("UPDATE orders SET status")) {
              orderStatus = args[0];
            }
            return { success: true };
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

const listRequest = new Request("https://members.chinamedicaltour.org/api/admin/refund-requests", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const listResponse = await handleAdmin({
  request: listRequest,
  env: {
    MEMBERS_DB: db,
    JWT_SECRET: secret,
  },
  url: new URL(listRequest.url),
  respond: (status, payload) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
});

assert.equal(listResponse.status, 200);
const listData = await listResponse.json();
assert.equal(listData.ok, true);
assert.equal(listData.requests.length, 1);
assert.equal(listData.requests[0].status, "pending");

const patchRequest = new Request("https://members.chinamedicaltour.org/api/admin/refund-requests/refund-1", {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ status: "approved", admin_note: "Ok" }),
});

const patchResponse = await handleAdmin({
  request: patchRequest,
  env: {
    MEMBERS_DB: db,
    JWT_SECRET: secret,
  },
  url: new URL(patchRequest.url),
  respond: (status, payload) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
});

assert.equal(patchResponse.status, 200);
const patchData = await patchResponse.json();
assert.equal(patchData.ok, true);
assert.equal(patchData.request.status, "approved");
assert.equal(patchData.order.status, "refund_approved");
