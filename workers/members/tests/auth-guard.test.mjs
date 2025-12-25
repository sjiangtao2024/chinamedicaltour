import assert from "node:assert/strict";
import { verifySessionToken } from "../src/lib/jwt.js";

await assert.rejects(
  () => verifySessionToken("bad.token", "secret"),
  /invalid_token/
);
