import assert from "node:assert/strict";
import { listAdminOrders } from "../src/lib/admin.js";

const calls = [];
const db = {
  prepare(sql) {
    return {
      bind(...args) {
        calls.push({ sql, args });
        return {
          all() {
            return { results: [{ id: "order-1", user_name: "Jane", user_email: "jane@example.com" }] };
          },
        };
      },
    };
  },
};

const result = await listAdminOrders(db, {
  status: "created",
  userId: "user-1",
  from: "2025-01-01T00:00:00.000Z",
  to: "2025-01-02T00:00:00.000Z",
  limit: 5,
});

assert.equal(result?.results?.length, 1);
assert.equal(result.results[0].user_name, "Jane");
assert.equal(result.results[0].user_email, "jane@example.com");
assert.equal(calls.length, 1);
const { sql, args } = calls[0];
assert.match(sql, /LEFT JOIN users/);
assert.match(sql, /LEFT JOIN user_profiles/);
assert.match(sql, /COALESCE/);
assert.equal(args[0], "created");
assert.equal(args[1], "user-1");
assert.equal(args[4], 5);
