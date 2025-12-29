import assert from "node:assert/strict";
import { isAdminAuthorized } from "../src/lib/admin.js";

assert.equal(isAdminAuthorized("", "token-1"), false);
assert.equal(isAdminAuthorized("Bearer token-1", "token-1"), true);
assert.equal(isAdminAuthorized("Bearer token-2", "token-1"), false);
