const UUID_REGEX =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const ORDER_TOKEN_REGEX = /\border\s*(id|number)?\s*[:#]?\s*([a-z0-9_-]{6,})/i;

const STATUS_LABELS = {
  created: "Created",
  awaiting_payment: "Awaiting payment",
  awaiting_capture: "Processing payment",
  paid_pending_profile: "Paid (profile pending)",
  paid: "Paid",
  payment_failed: "Payment failed",
  payment_expired: "Payment expired",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const ITEM_TYPE_LABELS = {
  package: "Package",
  deposit: "Deposit",
};

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toISOString().slice(0, 10);
}

function formatAmount(amount, currency) {
  const value = Number(amount || 0);
  const normalized = Number.isFinite(value) ? value / 100 : 0;
  const code = currency ? String(currency).toUpperCase() : "USD";
  return `${code} ${normalized.toFixed(2)}`;
}

export function extractOrderId(text) {
  if (!text) return null;
  const uuidMatch = text.match(UUID_REGEX);
  if (uuidMatch) return uuidMatch[0];
  const tokenMatch = text.match(ORDER_TOKEN_REGEX);
  if (tokenMatch) return tokenMatch[2];
  return null;
}

export function formatOrderSummary(order) {
  if (!order) return "I couldn't find that order.";
  const id = order.id || "Unknown";
  const statusRaw = order.status ? String(order.status) : "";
  const status = STATUS_LABELS[statusRaw] || (statusRaw ? statusRaw : "Unknown");
  const itemType = order.item_type ? String(order.item_type) : "";
  const itemId = order.item_id ? String(order.item_id) : "";
  const serviceLabel = ITEM_TYPE_LABELS[itemType] || "Service";
  const service = itemId ? `${serviceLabel} (${itemId})` : serviceLabel;
  const amount = formatAmount(order.amount_paid, order.currency);
  const updated = formatDate(order.updated_at || order.created_at);

  return [
    `Order ID: ${id}`,
    `Status: ${status}`,
    `Service: ${service}`,
    `Amount: ${amount}`,
    `Updated: ${updated}`,
    "To request changes or refunds, please use Member Center: https://chinamedicaltour.org/member-center",
  ].join("\n");
}

export function buildOrderNotFoundReply() {
  return (
    "I couldn't find that order. Please double-check the order ID and try again. " +
    "If you need to update or refund an order, please use Member Center: " +
    "https://chinamedicaltour.org/member-center"
  );
}
