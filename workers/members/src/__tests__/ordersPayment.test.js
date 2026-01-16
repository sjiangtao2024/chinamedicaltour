import test from "node:test";
import assert from "node:assert/strict";
import { updateOrderPayment } from "../lib/orders.js";

const createDbSpy = () => {
  const calls = [];
  return {
    calls,
    db: {
      prepare(query) {
        const call = { query, binds: [] };
        calls.push(call);
        return {
          bind(...params) {
            call.binds = params;
            return {
              run() {
                return { success: true };
              },
              first() {
                return { id: "order-1" };
              },
            };
          },
        };
      },
    },
  };
};

test("updateOrderPayment persists payment channel and transaction id", async () => {
  const { db, calls } = createDbSpy();

  await updateOrderPayment(db, "order-1", {
    paypalOrderId: "paypal-order",
    paypalCaptureId: "paypal-capture",
    paymentChannel: "wechat",
    transactionId: "wx-transaction",
    serviceStatus: "pending_contact",
    status: "paid",
    paymentGatewayFee: 120,
  });

  assert.equal(calls.length, 2);
  const updateCall = calls[0];
  assert.ok(updateCall.query.includes("payment_channel"));
  assert.ok(updateCall.query.includes("transaction_id"));
  assert.ok(updateCall.query.includes("service_status"));
  assert.deepEqual(updateCall.binds.slice(0, 2), ["paypal-order", "paypal-capture"]);
  assert.equal(updateCall.binds[2], 120);
  assert.equal(updateCall.binds[3], "wechat");
  assert.equal(updateCall.binds[4], "wx-transaction");
  assert.equal(updateCall.binds[5], "pending_contact");
  assert.equal(updateCall.binds[6], "paid");
  assert.equal(updateCall.binds[updateCall.binds.length - 1], "order-1");
});
