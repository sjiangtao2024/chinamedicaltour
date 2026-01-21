const HIGH_INTENT_KEYWORDS = [
  "price",
  "pricing",
  "cost",
  "quote",
  "quotation",
  "pay",
  "payment",
  "book",
  "booking",
  "schedule",
  "appointment",
  "order",
  "checkout",
  "deposit",
  "invoice",
  "buy",
  "purchase",
  "价格",
  "报价",
  "费用",
  "付款",
  "支付",
  "下单",
  "预约",
  "订金",
  "押金",
];

const MEDIUM_INTENT_KEYWORDS = [
  "process",
  "workflow",
  "prepare",
  "requirements",
  "requirement",
  "steps",
  "timeline",
  "how does it work",
  "流程",
  "准备",
  "材料",
  "步骤",
  "安排",
  "多久",
  "需要",
];

function matchKeyword(text, keywords) {
  return keywords.find((keyword) => text.includes(keyword));
}

export function classifyPurchaseIntent(text) {
  if (!text || typeof text !== "string") {
    return { level: "low", reason: "no_text" };
  }
  const lower = text.toLowerCase();
  const high = matchKeyword(lower, HIGH_INTENT_KEYWORDS);
  if (high) {
    return { level: "high", reason: high };
  }
  const medium = matchKeyword(lower, MEDIUM_INTENT_KEYWORDS);
  if (medium) {
    return { level: "medium", reason: medium };
  }
  return { level: "low", reason: "default" };
}
