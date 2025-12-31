import assert from "node:assert/strict";
import { isAdminUser } from "../src/lib/admin.js";

const fakeDb = {
  prepare() {
    return {
      bind(userId) {
        return {
          async first() {
            if (userId === "user-1") {
              return { user_id: "user-1", role: "admin" };
            }
            return null;
          },
        };
      },
    };
  },
};

assert.equal(await isAdminUser(fakeDb, "user-1"), true);
assert.equal(await isAdminUser(fakeDb, "user-2"), false);
assert.equal(await isAdminUser(null, "user-1"), false);
assert.equal(await isAdminUser(fakeDb, ""), false);
