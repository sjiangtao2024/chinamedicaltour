import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/jwt.js";
import { handleProfile } from "../src/routes/profile.js";

const secret = "secret";
const token = await createSessionToken({ userId: "user-1" }, secret);

const db = {
  prepare(sql) {
    return {
      bind() {
        return {
          async first() {
            if (sql.includes("FROM user_profiles")) {
              return null;
            }
            if (sql.includes("FROM users")) {
              return { email: "user@example.com", name: "User Name" };
            }
            return null;
          },
        };
      },
    };
  },
};

const request = new Request("https://members.chinamedicaltour.org/api/profile", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const response = await handleProfile({
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
const payload = await response.json();
assert.equal(payload.profile.email, "user@example.com");
assert.equal(payload.profile.name, "User Name");
assert.equal(payload.profile.user_id, "user-1");
