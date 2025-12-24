import assert from "node:assert/strict";
import { buildOrderPayload } from "../src/lib/paypal.js";

const payload = buildOrderPayload({ amount: 100, currency: "USD" });
assert.equal(payload.intent, "CAPTURE");
