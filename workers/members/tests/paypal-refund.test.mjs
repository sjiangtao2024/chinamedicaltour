import assert from "node:assert/strict";
import { buildRefundPayload } from "../src/lib/paypal.js";

const payload = buildRefundPayload({ amount: 120000, currency: "USD", noteToPayer: "refund" });
assert.equal(payload.amount.value, "1200.00");
assert.equal(payload.amount.currency_code, "USD");
assert.equal(payload.note_to_payer, "refund");

const fullPayload = buildRefundPayload({ currency: "USD" });
assert.equal(fullPayload.amount, undefined);
