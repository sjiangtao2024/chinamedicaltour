import assert from "node:assert/strict";
import {
  buildOrderNotFoundReply,
  extractOrderId,
  formatOrderSummary,
} from "../src/lib/order-support.js";

const sampleUuid = "550e8400-e29b-41d4-a716-446655440000";

assert.equal(
  extractOrderId(`Here is my order id: ${sampleUuid}. Please check.`),
  sampleUuid,
);

assert.equal(
  extractOrderId("Order ID: order-1 please"),
  "order-1",
);

const summary = formatOrderSummary({
  id: sampleUuid,
  item_type: "package",
  item_id: "health-screening",
  amount_paid: 29900,
  currency: "USD",
  status: "paid",
  updated_at: "2026-01-19T10:00:00.000Z",
});

assert.match(summary, /Order ID: 550e8400-e29b-41d4-a716-446655440000/);
assert.match(summary, /Status: Paid/);
assert.match(summary, /Service: Package \(health-screening\)/);
assert.match(summary, /Amount: USD 299\.00/);
assert.match(summary, /Updated: 2026-01-19/);

assert.match(buildOrderNotFoundReply(), /couldn't find that order/i);
