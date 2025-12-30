import assert from "node:assert/strict";
import { parseBearerToken } from "../src/lib/auth.js";

assert.equal(parseBearerToken("Bearer abc.def"), "abc.def");
assert.equal(parseBearerToken("bearer    token-123"), "token-123");
assert.equal(parseBearerToken(""), "");
