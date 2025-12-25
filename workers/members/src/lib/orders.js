export async function findOrderByIdempotency(db, idempotencyKey) {
  return db
    .prepare("SELECT * FROM orders WHERE idempotency_key = ?")
    .bind(idempotencyKey)
    .first();
}

export async function findOrderById(db, orderId) {
  return db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
}

export async function insertOrder(db, data) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO orders (id, user_id, item_type, item_id, amount_original, discount_amount, amount_paid, currency, ref_channel, coupon_id, paypal_order_id, paypal_capture_id, status, idempotency_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
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
      "UPDATE orders SET paypal_order_id = ?, paypal_capture_id = ?, status = ?, updated_at = ? WHERE id = ?"
    )
    .bind(
      updates.paypalOrderId || null,
      updates.paypalCaptureId || null,
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
