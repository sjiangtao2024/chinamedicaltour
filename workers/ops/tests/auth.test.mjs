import assert from "node:assert/strict";
import { isValidToken } from "../src/lib/auth.js";

assert.equal(isValidToken("", "secret"), false);
assert.equal(isValidToken("secret", "secret"), true);
