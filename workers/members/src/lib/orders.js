export async function findOrderByIdempotency(db, idempotencyKey) {
  return db
    .prepare("SELECT * FROM orders WHERE idempotency_key = ?")
    .bind(idempotencyKey)
    .first();
}

export async function findOrderById(db, orderId) {
  return db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
}

export async function findServiceProduct(db, { itemType, itemId }) {
  if (!db || !itemType || !itemId) {
    return null;
  }
  return db
    .prepare("SELECT * FROM service_products WHERE item_type = ? AND item_id = ?")
    .bind(itemType, itemId)
    .first();
}

export async function findOpenOrderForUserItem(db, userId, itemType, itemId) {
  if (!db || !userId || !itemType || !itemId) {
    return null;
  }
  return db
    .prepare(
      "SELECT * FROM orders WHERE user_id = ? AND item_type = ? AND item_id = ? AND status IN ('created','awaiting_payment','awaiting_capture') ORDER BY created_at DESC LIMIT 1"
    )
    .bind(userId, itemType, itemId)
    .first();
}

export async function insertOrder(db, data) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO orders (id, user_id, item_type, item_id, amount_original, discount_amount, amount_paid, currency, ref_channel, coupon_id, intake_summary, refund_policy_type, terms_version, terms_agreed_at, service_start_date, delivery_status, delivered_at, payment_gateway_fee, is_deposit, check_in_date, amount_refunded, paypal_order_id, paypal_capture_id, status, idempotency_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      id,
      data.userId,
      data.itemType,
      data.itemId,
      data.amountOriginal,
      data.discountAmount,
      data.amountPaid,
      data.currency,
      data.refChannel,
      data.couponId,
      data.intakeSummary || null,
      data.refundPolicyType || null,
      data.termsVersion || null,
      data.termsAgreedAt || null,
      data.serviceStartDate || null,
      data.deliveryStatus || "PENDING",
      data.deliveredAt || null,
      Number.isFinite(data.paymentGatewayFee) ? data.paymentGatewayFee : 0,
      data.isDeposit ? 1 : 0,
      data.checkInDate || null,
      Number.isFinite(data.amountRefunded) ? data.amountRefunded : 0,
      null,
      null,
      data.status,
      data.idempotencyKey,
      now,
      now
    )
    .run();

  return {
    id,
    user_id: data.userId,
    item_type: data.itemType,
    item_id: data.itemId,
    amount_original: data.amountOriginal,
    discount_amount: data.discountAmount,
    amount_paid: data.amountPaid,
    currency: data.currency,
    ref_channel: data.refChannel,
    coupon_id: data.couponId,
    intake_summary: data.intakeSummary || null,
    refund_policy_type: data.refundPolicyType || null,
    terms_version: data.termsVersion || null,
    terms_agreed_at: data.termsAgreedAt || null,
    service_start_date: data.serviceStartDate || null,
    delivery_status: data.deliveryStatus || "PENDING",
    delivered_at: data.deliveredAt || null,
    payment_gateway_fee: Number.isFinite(data.paymentGatewayFee) ? data.paymentGatewayFee : 0,
    is_deposit: data.isDeposit ? 1 : 0,
    check_in_date: data.checkInDate || null,
    amount_refunded: Number.isFinite(data.amountRefunded) ? data.amountRefunded : 0,
    status: data.status,
    idempotency_key: data.idempotencyKey,
    created_at: now,
    updated_at: now,
  };
}

export async function updateOrderPayment(db, orderId, updates) {
  const now = new Date().toISOString();
  await db
    .prepare(
      "UPDATE orders SET paypal_order_id = ?, paypal_capture_id = ?, payment_gateway_fee = COALESCE(?, payment_gateway_fee), payment_channel = COALESCE(?, payment_channel), transaction_id = COALESCE(?, transaction_id), service_status = COALESCE(?, service_status), status = ?, updated_at = ? WHERE id = ?"
    )
    .bind(
      updates.paypalOrderId || null,
      updates.paypalCaptureId || null,
      Number.isFinite(updates.paymentGatewayFee) ? updates.paymentGatewayFee : null,
      updates.paymentChannel || null,
      updates.transactionId || null,
      updates.serviceStatus || null,
      updates.status,
      now,
      orderId
    )
    .run();

  return db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
}

export async function updateOrderStatus(db, orderId, status) {
  const now = new Date().toISOString();
  await db
    .prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?")
    .bind(status, now, orderId)
    .run();

  return db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
}

export async function updateOrderServiceStatus(db, orderId, serviceStatus) {
  const now = new Date().toISOString();
  await db
    .prepare("UPDATE orders SET service_status = ?, updated_at = ? WHERE id = ?")
    .bind(serviceStatus || null, now, orderId)
    .run();

  return db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
}

export async function updateOrderServiceStartDate(db, orderId, serviceStartDate) {
  if (!serviceStartDate) {
    return null;
  }
  const now = new Date().toISOString();
  await db
    .prepare("UPDATE orders SET service_start_date = ?, updated_at = ? WHERE id = ?")
    .bind(serviceStartDate, now, orderId)
    .run();

  return db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
}

const PAYMENT_EXPIRY_MS = 2 * 60 * 60 * 1000;

export function isOrderPaymentExpired(order, now = new Date()) {
  if (!order?.created_at) {
    return false;
  }
  const status = String(order.status || "");
  if (!["created", "awaiting_payment"].includes(status)) {
    return false;
  }
  const createdAt = new Date(order.created_at);
  if (Number.isNaN(createdAt.getTime())) {
    return false;
  }
  return now.getTime() - createdAt.getTime() >= PAYMENT_EXPIRY_MS;
}

export async function expireOrderIfNeeded(db, order, now = new Date()) {
  if (!order || !db) {
    return order;
  }
  if (!isOrderPaymentExpired(order, now)) {
    return order;
  }
  const updated = await updateOrderStatus(db, order.id, "payment_expired");
  return updated || { ...order, status: "payment_expired" };
}

export function toOrderSummary(order) {
  if (!order) {
    return null;
  }
  return {
    id: order.id,
    item_type: order.item_type,
    item_id: order.item_id,
    amount_paid: order.amount_paid,
    currency: order.currency,
    status: order.status,
    service_status: order.service_status || null,
    created_at: order.created_at,
  };
}

export async function listOrdersByUser(db, userId, limit = 10) {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 10;
  return db
    .prepare(
      "SELECT id, item_type, item_id, amount_paid, currency, status, service_status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
    )
    .bind(userId, safeLimit)
    .all();
}

export async function listServiceProducts(db, { itemType = "package" } = {}) {
  if (!db) {
    return { results: [] };
  }
  return db
    .prepare(
      "SELECT item_type, item_id, name, category, price, currency, features, refund_policy_type, terms_version FROM service_products WHERE item_type = ? ORDER BY name ASC"
    )
    .bind(itemType)
    .all();
}

export async function findOrderByUser(db, orderId, userId) {
  return db
    .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
    .bind(orderId, userId)
    .first();
}

export async function markPaidOrdersProfileCompleted(db, userId) {
  const now = new Date().toISOString();
  return db
    .prepare("UPDATE orders SET status = ?, updated_at = ? WHERE user_id = ? AND status = ?")
    .bind("paid", now, userId, "paid_pending_profile")
    .run();
}
export async function requireProfile(db, userId) {
  if (!db || !userId) {
    throw new Error("missing_profile");
  }
  const profile = await db
    .prepare("SELECT user_id FROM user_profiles WHERE user_id = ?")
    .bind(userId)
    .first();
  if (!profile) {
    throw new Error("missing_profile");
  }
  return profile;
}
export function normalizeOrderInput(input) {
  return {
    itemType: input?.item_type ? String(input.item_type).trim() : "",
    itemId: input?.item_id ? String(input.item_id).trim() : "",
    currency: input?.currency ? String(input.currency).trim() : "",
    amountOriginal: Number(input?.amount_original || 0),
    refChannel: input?.ref_channel ? String(input.ref_channel).trim() : "",
    couponCode: input?.coupon_code ? String(input.coupon_code).trim() : "",
    intakeSummary: input?.intake_summary ? String(input.intake_summary).trim() : "",
    termsVersion: input?.terms_version ? String(input.terms_version).trim() : "",
    termsAgreedAt: input?.terms_agreed_at ? String(input.terms_agreed_at).trim() : "",
    idempotencyKey: input?.idempotency_key
      ? String(input.idempotency_key).trim()
      : "",
  };
}
