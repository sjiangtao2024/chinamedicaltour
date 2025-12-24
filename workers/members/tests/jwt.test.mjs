import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/jwt.js";

const token = await createSessionToken({ userId: "u1" }, "secret");
assert.ok(token.split(".").length === 3);
