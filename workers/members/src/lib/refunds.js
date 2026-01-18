function toInt(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Math.round(num);
}

function clampAmount(value) {
  return Math.max(0, Math.round(value));
}

function parseDate(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function calculateRefund({ order, now = new Date() }) {
  if (!order) {
    return { status: "missing_data", reason: "order_missing", refundable_amount: 0 };
  }

  const policy = String(order.refund_policy_type || "").toUpperCase();
  if (!policy) {
    return { status: "missing_data", reason: "refund_policy_missing", refundable_amount: 0 };
  }

  const amountPaid = toInt(order.amount_paid);
  const gatewayFee = toInt(order.payment_gateway_fee || 0);
  const baseAmount = Math.max(0, amountPaid - gatewayFee);
  let effectivePolicy = policy;

  if (effectivePolicy === "THIRD_PARTY") {
    return { status: "requires_manual_review", reason: "third_party", refundable_amount: 0 };
  }

  if (effectivePolicy === "INTELLECTUAL") {
    if (String(order.item_id || "") === "pre-consultation") {
      return { status: "not_refundable", reason: "intellectual_non_refundable", refundable_amount: 0 };
    }
    effectivePolicy = "STANDARD";
  }

  const serviceStart = parseDate(order.service_start_date);
  if (!serviceStart) {
    return { status: "missing_data", reason: "service_start_date_missing", refundable_amount: 0 };
  }

  const diffMs = serviceStart.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (effectivePolicy === "STANDARD") {
    if (diffHours > 168) {
      return { status: "ok", reason: "more_than_7_days", refundable_amount: clampAmount(baseAmount * 0.9) };
    }
    if (diffHours >= 72) {
      return { status: "ok", reason: "between_3_and_7_days", refundable_amount: clampAmount(baseAmount * 0.5) };
    }
    if (diffHours >= 48) {
      return {
        status: "requires_manual_review",
        reason: "between_48_hours_and_3_days",
        refundable_amount: clampAmount(baseAmount * 0.5),
      };
    }
    return { status: "not_refundable", reason: "less_than_48_hours", refundable_amount: 0 };
  }

  if (effectivePolicy === "CUSTOM") {
    if (diffDays >= 30) {
      return { status: "ok", reason: "more_than_30_days", refundable_amount: clampAmount(baseAmount * 0.8) };
    }
    if (diffDays >= 15) {
      return { status: "ok", reason: "between_15_and_29_days", refundable_amount: clampAmount(baseAmount * 0.5) };
    }
    return { status: "not_refundable", reason: "less_than_15_days", refundable_amount: 0 };
  }

  return { status: "missing_data", reason: "unsupported_policy", refundable_amount: 0 };
}
