import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/jwt.js";
import { checkBearerToken } from "../src/lib/auth.js";

const token = await createSessionToken({ userId: "user-1" }, "secret");
const ok = await checkBearerToken(`Bearer ${token}`, "secret");
assert.equal(ok.ok, true);
assert.equal(ok.userId, "user-1");

const missingToken = await checkBearerToken("", "secret");
assert.equal(missingToken.ok, false);
assert.equal(missingToken.error, "missing_token");

const badToken = await checkBearerToken("Bearer bad.token", "secret");
assert.equal(badToken.ok, false);
