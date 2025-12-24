import assert from "node:assert/strict";
import { applyCoupon } from "../src/lib/coupons.js";

assert.deepEqual(applyCoupon(10000, { type: "percent", value: 10 }), {
  original: 10000,
  discount: 1000,
  paid: 9000,
});
