import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/jwt.js";
import { handleOrders } from "../src/routes/orders.js";

const secret = "test-secret";
const token = await createSessionToken({ userId: "user-1" }, secret);

const orderRow = () => ({
  id: "order-1",
  user_id: "user-1",
  item_type: "package",
  item_id: "full-body",
  amount_paid: 80000,
  currency: "USD",
  status: "paid",
  created_at: "2025-01-01T00:00:00.000Z",
});

let hasProfile = true;
let profileHasName = true;
let hasUserProfile = true;
let hasUserName = true;

const db = {
  prepare(sql) {
    return {
      bind(...args) {
        return {
          async first() {
            if (sql.includes("FROM orders WHERE id = ? AND user_id = ?")) {
              return orderRow();
            }
            if (sql.includes("FROM order_profiles")) {
              if (!hasProfile) {
                return null;
              }
              return {
                order_id: "order-1",
                name: profileHasName ? "Order Name" : null,
                email: "jane.doe@example.com",
                contact_info: "+1 312 555 7788",
                emergency_contact: "John Doe +1 312 555 9900",
                checkup_date: "2026-01-20",
              };
            }
            if (sql.includes("FROM user_profiles")) {
              if (!hasUserProfile) {
                return null;
              }
              return {
                name: "User Name",
                email: "user.name@example.com",
              };
            }
            if (sql.includes("FROM users")) {
              if (!hasUserName) {
                return null;
              }
              return {
                name: "User Fallback",
              };
            }
            return null;
          },
        };
      },
    };
  },
};

const request = new Request("https://members.chinamedicaltour.org/api/orders/order-1/profile", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const response = await handleOrders({
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
assert.equal(data.profile.email, "jane.doe@example.com");
assert.equal(data.profile.name, "Order Name");

profileHasName = false;
const fallbackResponse = await handleOrders({
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

assert.equal(fallbackResponse.status, 200);
const fallbackPayload = await fallbackResponse.json();
assert.equal(fallbackPayload.profile.name, "User Name");

hasUserProfile = false;
const userFallbackResponse = await handleOrders({
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

assert.equal(userFallbackResponse.status, 200);
const userFallbackPayload = await userFallbackResponse.json();
assert.equal(userFallbackPayload.profile.name, "User Fallback");

hasProfile = false;
hasUserProfile = true;
const missingOrderProfileResponse = await handleOrders({
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

assert.equal(missingOrderProfileResponse.status, 200);
const missingOrderProfilePayload = await missingOrderProfileResponse.json();
assert.equal(missingOrderProfilePayload.profile.name, "User Name");

hasUserProfile = false;
hasUserName = false;
const secondResponse = await handleOrders({
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

assert.equal(secondResponse.status, 404);
const errorPayload = await secondResponse.json();
assert.equal(errorPayload.error, "order_profile_not_found");
