import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/jwt.js";
import { handleAdmin } from "../src/routes/admin.js";

const secret = "test-secret";
const token = await createSessionToken({ userId: "admin-1" }, secret);

const db = {
  prepare(sql) {
    return {
      bind() {
        return {
          async first() {
            if (sql.includes("FROM admin_users")) {
              return { user_id: "admin-1", role: "admin" };
            }
            if (sql.includes("COUNT(*)")) {
              return { total: 42 };
            }
            return null;
          },
          async all() {
            if (sql.includes("FROM users")) {
              return {
                results: [
                  {
                    id: "user-1",
                    email: "jane@example.com",
                    contact_info: "+1 222 333 4444",
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

const request = new Request(
  "https://members.chinamedicaltour.org/api/admin/members?limit=20&offset=0&q=jane",
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
);

const response = await handleAdmin({
  request,
  env: { MEMBERS_DB: db, JWT_SECRET: secret },
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
assert.equal(data.total, 42);
assert.equal(data.members?.length, 1);
assert.equal(data.members[0].email, "jane@example.com");
