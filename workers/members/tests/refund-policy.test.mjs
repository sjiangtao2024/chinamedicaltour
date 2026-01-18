import assert from "node:assert/strict";
import { calculateRefund } from "../src/lib/refunds.js";

const now = new Date("2026-01-14T12:00:00Z");

const baseOrder = {
  amount_paid: 10000,
  payment_gateway_fee: 500,
  refund_policy_type: "STANDARD",
  item_id: "full-body",
  service_start_date: "2026-01-24T12:00:00Z",
};

{
  const result = calculateRefund({
    order: {
      ...baseOrder,
      refund_policy_type: "INTELLECTUAL",
      item_id: "pre-consultation",
      delivery_status: "DELIVERED",
      delivered_at: "2026-01-10T12:00:00Z",
    },
    now,
  });
  assert.equal(result.status, "not_refundable");
  assert.equal(result.refundable_amount, 0);
}

{
  const result = calculateRefund({
    order: {
      ...baseOrder,
      refund_policy_type: "INTELLECTUAL",
      item_id: "pre-consultation",
      delivery_status: "IN_PROGRESS",
    },
    now,
  });
  assert.equal(result.status, "not_refundable");
  assert.equal(result.refundable_amount, 0);
}

{
  const result = calculateRefund({
    order: {
      ...baseOrder,
      refund_policy_type: "INTELLECTUAL",
      item_id: "pre-consultation",
      delivery_status: "PENDING",
    },
    now,
  });
  assert.equal(result.status, "not_refundable");
  assert.equal(result.refundable_amount, 0);
}

{
  const result = calculateRefund({
    order: {
      ...baseOrder,
      refund_policy_type: "INTELLECTUAL",
      item_id: "full-body",
    },
    now,
  });
  assert.equal(result.status, "ok");
  assert.equal(result.refundable_amount, 8550);
}

{
  const result = calculateRefund({ order: baseOrder, now });
  assert.equal(result.status, "ok");
  assert.equal(result.refundable_amount, 8550);
}

{
  const result = calculateRefund({
    order: {
      ...baseOrder,
      service_start_date: "2026-01-16T20:00:00Z",
    },
    now,
  });
  assert.equal(result.status, "requires_manual_review");
  assert.equal(result.refundable_amount, 4750);
}

{
  const result = calculateRefund({
    order: {
      ...baseOrder,
      service_start_date: "2026-01-15T10:00:00Z",
    },
    now,
  });
  assert.equal(result.status, "not_refundable");
  assert.equal(result.refundable_amount, 0);
}

{
  const result = calculateRefund({
    order: {
      ...baseOrder,
      refund_policy_type: "CUSTOM",
      service_start_date: "2026-02-03T12:00:00Z",
    },
    now,
  });
  assert.equal(result.status, "ok");
  assert.equal(result.refundable_amount, 4750);
}

{
  const result = calculateRefund({
    order: {
      ...baseOrder,
      refund_policy_type: "THIRD_PARTY",
    },
    now,
  });
  assert.equal(result.status, "requires_manual_review");
  assert.equal(result.refundable_amount, 0);
}

{
  const result = calculateRefund({
    order: {
      ...baseOrder,
      refund_policy_type: "STANDARD",
      service_start_date: "",
    },
    now,
  });
  assert.equal(result.status, "missing_data");
}
