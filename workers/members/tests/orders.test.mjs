import assert from "node:assert/strict";
import { applyCoupon } from "../src/lib/coupons.js";
import { normalizeOrderInput } from "../src/lib/orders.js";

assert.deepEqual(applyCoupon(10000, { type: "percent", value: 10 }), {
  original: 10000,
  discount: 1000,
  paid: 9000,
});

assert.equal(normalizeOrderInput({ item_type: "package" }).itemType, "package");
assert.equal(
  normalizeOrderInput({ intake_summary: "Case summary" }).intakeSummary,
  "Case summary"
);
