import assert from "node:assert/strict";
import { expireOrderIfNeeded, isOrderPaymentExpired } from "../src/lib/orders.js";

let latestStatus = null;
const db = {
  prepare(sql) {
    return {
      bind(...args) {
        return {
          async run() {
            if (sql.startsWith("UPDATE orders SET status")) {
              latestStatus = args[0];
            }
            return { success: true, args };
          },
          async first() {
            return { id: "order-1", status: latestStatus || "payment_expired" };
          },
        };
      },
    };
  },
};

const now = new Date("2025-01-01T03:00:00.000Z");
const order = {
  id: "order-1",
  status: "awaiting_payment",
  created_at: "2025-01-01T00:00:00.000Z",
};

assert.equal(isOrderPaymentExpired(order, now), true);

const updated = await expireOrderIfNeeded(db, order, now);
assert.equal(updated.status, "payment_expired");
