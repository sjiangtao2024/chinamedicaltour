import assert from "node:assert/strict";
import { findOpenOrderForUserItem } from "../src/lib/orders.js";

const calls = [];
const db = {
  prepare(sql) {
    return {
      bind(...args) {
        calls.push({ sql, args });
        return {
          first() {
            return { id: "order-1" };
          },
        };
      },
    };
  },
};

const order = await findOpenOrderForUserItem(db, "user-1", "package", "full-body");

assert.equal(order?.id, "order-1");
assert.equal(calls.length, 1);
const { sql, args } = calls[0];
assert.match(sql, /FROM orders/);
assert.match(sql, /status IN/);
assert.equal(args[0], "user-1");
assert.equal(args[1], "package");
assert.equal(args[2], "full-body");
