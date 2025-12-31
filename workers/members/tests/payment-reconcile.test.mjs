import assert from "node:assert/strict";
import { reconcilePaypalTransactions } from "../src/lib/admin.js";

const orders = [
  {
    id: "order-1",
    paypal_order_id: "paypal-order-1",
    paypal_capture_id: "capture-1",
  },
  {
    id: "order-2",
    paypal_order_id: "paypal-order-2",
    paypal_capture_id: null,
  },
];

const transactions = [
  {
    transaction_info: {
      transaction_id: "capture-1",
      paypal_reference_id: "paypal-order-1",
    },
  },
  {
    transaction_info: {
      transaction_id: "capture-2",
      paypal_reference_id: "paypal-order-3",
    },
  },
];

const result = reconcilePaypalTransactions(orders, transactions);

assert.equal(result.matched.length, 1);
assert.equal(result.matched[0].order.id, "order-1");
assert.equal(result.paypal_missing_order.length, 1);
assert.equal(result.order_missing_paypal.length, 1);
