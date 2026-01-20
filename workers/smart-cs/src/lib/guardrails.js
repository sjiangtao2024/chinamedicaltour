const POLICY_KEYWORDS = [
  "policy",
  "terms",
  "refund",
  "refundable",
  "cancellation",
  "cancel",
  "chargeback",
  "charge back",
  "dispute",
  "treatment flow",
  "service flow",
  "treatment process",
  "service process",
  "treatment steps",
  "service steps",
];

const ORDER_KEYWORDS = [
  "order",
  "order id",
  "order number",
  "invoice",
  "receipt",
  "transaction",
  "payment status",
  "refund request",
  "refund status",
];

function normalizeText(text) {
  return (text || "").toLowerCase();
}

function hasKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function classifySupportIntent(text) {
  const lower = normalizeText(text);
  const isOrder = hasKeyword(lower, ORDER_KEYWORDS);
  const isPolicy = hasKeyword(lower, POLICY_KEYWORDS);

  if (isOrder) return "order";
  if (isPolicy) return "policy";
  return null;
}

export function buildLoginRequiredReply() {
  return (
    "To check or manage an order, please log in first at " +
    "https://chinamedicaltour.org/auth. " +
    "After logging in, reply with your order ID and I will help you."
  );
}

export function buildPolicyFallbackReply() {
  return (
    "I’m sorry, I don’t have that policy detail in our official knowledge base. " +
    "Please contact support at https://chinamedicaltour.org/contact."
  );
}

export function buildOrderInfoRequestReply() {
  return (
    "Please share your order ID so I can help check the order status or refund request."
  );
}
