import assert from "node:assert/strict";
import { handleOrders } from "../src/routes/orders.js";

const orderId = "order-123";
let serviceStartDate = null;

const db = {
  prepare(sql) {
    return {
      bind(...args) {
        return {
          async first() {
            if (sql.includes("FROM orders WHERE id = ?")) {
              return { id: orderId, user_id: "user-1" };
            }
            return null;
          },
          async run() {
            if (sql.startsWith("UPDATE orders SET service_start_date")) {
              serviceStartDate = args[0];
            }
            return { success: true };
          },
        };
      },
    };
  },
};

const request = new Request(`https://members.chinamedicaltour.org/api/orders/${orderId}/profile`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "test@example.com",
    checkup_date: "2026-02-01",
  }),
});

const response = await handleOrders({
  request,
  env: { MEMBERS_DB: db },
  url: new URL(request.url),
  respond: (status, payload) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
});

assert.equal(response.status, 200);
assert.equal(serviceStartDate, "2026-02-01");
