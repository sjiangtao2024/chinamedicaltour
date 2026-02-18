import assert from "node:assert/strict";
import { buildOrderPayload, resolvePaypalBase } from "../src/lib/paypal.js";

const payload = buildOrderPayload({ amount: 100, currency: "USD" });
assert.equal(payload.intent, "CAPTURE");

assert.equal(resolvePaypalBase("sandbox"), "https://api-m.sandbox.paypal.com");
assert.equal(resolvePaypalBase("live"), "https://api-m.paypal.com");
