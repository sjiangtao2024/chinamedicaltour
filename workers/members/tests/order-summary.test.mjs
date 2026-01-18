import assert from "node:assert/strict";
import { toOrderSummary } from "../src/lib/orders.js";

const summary = toOrderSummary({
  id: "order-1",
  item_type: "package",
  item_id: "full-body",
  amount_paid: 80000,
  currency: "USD",
  status: "paid",
  created_at: "2025-12-31T00:00:00.000Z",
  user_id: "user-1",
  paypal_order_id: "paypal-1",
});

assert.deepEqual(summary, {
  id: "order-1",
  item_type: "package",
  item_id: "full-body",
  amount_paid: 80000,
  currency: "USD",
  status: "paid",
  service_status: null,
  created_at: "2025-12-31T00:00:00.000Z",
});
