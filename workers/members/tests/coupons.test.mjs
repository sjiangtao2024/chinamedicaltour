import assert from "node:assert/strict";
import { applyCoupon, isCouponActive } from "../src/lib/coupons.js";

assert.deepEqual(
  applyCoupon(10000, { type: "percent", value: 20, max_discount: 1000 }),
  { original: 10000, discount: 1000, paid: 9000 }
);

assert.equal(
  isCouponActive({
    usage_limit: 2,
    used_count: 2,
    valid_from: null,
    valid_to: null,
    type: "percent",
    value: 10,
  }),
  false
);

assert.equal(
  isCouponActive({
    usage_limit: null,
    used_count: 0,
    valid_from: "2099-01-01T00:00:00.000Z",
    valid_to: null,
    type: "percent",
    value: 10,
  }),
  false
);
