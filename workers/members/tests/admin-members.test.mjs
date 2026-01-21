import assert from "node:assert/strict";
import { listAdminMembers } from "../src/lib/admin.js";

const calls = [];
const db = {
  prepare(sql) {
    return {
      bind(...args) {
        calls.push({ sql, args });
        return {
          all() {
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
          },
        };
      },
    };
  },
};

const result = await listAdminMembers(db, {
  query: "jane",
  limit: 20,
  offset: 10,
});

assert.equal(result?.results?.length, 1);
assert.equal(result.results[0].email, "jane@example.com");
assert.equal(calls.length, 1);
const { sql, args } = calls[0];
assert.match(sql, /FROM users/);
assert.match(sql, /LEFT JOIN user_profiles/);
assert.match(sql, /contact_info/);
assert.match(sql, /users.email LIKE/);
assert.equal(args[0], "%jane%");
assert.equal(args[1], "%jane%");
assert.equal(args[3], 20);
assert.equal(args[4], 10);
