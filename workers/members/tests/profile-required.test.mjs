import assert from "node:assert/strict";
import { isProfileComplete } from "../src/lib/profile.js";

assert.equal(isProfileComplete(null), false);
assert.equal(isProfileComplete({}), false);
assert.equal(isProfileComplete({ user_id: "user-1" }), true);
