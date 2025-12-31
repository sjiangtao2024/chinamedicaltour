import assert from "node:assert/strict";
import { markPaidOrdersProfileCompleted } from "../src/lib/orders.js";

const calls = [];
const db = {
  prepare(sql) {
    return {
      bind(...args) {
        calls.push({ sql, args });
        return {
          run() {
            return { success: true };
          },
        };
      },
    };
  },
};

await markPaidOrdersProfileCompleted(db, "user-1");

assert.equal(calls.length, 1);
const { sql, args } = calls[0];
assert.match(sql, /UPDATE orders SET status = \?, updated_at = \? WHERE user_id = \? AND status = \?/);
assert.equal(args[0], "paid");
assert.equal(args[2], "user-1");
assert.equal(args[3], "paid_pending_profile");
assert.equal(typeof args[1], "string");
