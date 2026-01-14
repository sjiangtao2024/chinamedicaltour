import {
  findOrderById,
  findOrderByIdempotency,
  findOpenOrderForUserItem,
  findOrderByUser,
  findServiceProduct,
  insertOrder,
  listServiceProducts,
  listOrdersByUser,
  normalizeOrderInput,
  requireProfile,
  toOrderSummary,
  expireOrderIfNeeded,
  isOrderPaymentExpired,
  updateOrderStatus,
  updateOrderServiceStartDate,
} from "../lib/orders.js";
import { calculateRefund } from "../lib/refunds.js";
import { applyCoupon, incrementCouponUsage, resolveCoupon } from "../lib/coupons.js";
import { insertOrderProfile, normalizeProfile, updateUserFromProfile } from "../lib/profile.js";
import { requireAuth, requireDb, readJson } from "../lib/request.js";

function matchProfilePath(pathname) {
  const match = pathname.match(/^\/api\/orders\/([^/]+)\/profile$/);
  return match ? match[1] : null;
}

function matchCancelPath(pathname) {
  const match = pathname.match(/^\/api\/orders\/([^/]+)\/cancel$/);
  return match ? match[1] : null;
}

function matchRefundPath(pathname) {
  const match = pathname.match(/^\/api\/orders\/([^/]+)\/refund-request$/);
  return match ? match[1] : null;
}

function matchRefundEstimatePath(pathname) {
  const match = pathname.match(/^\/api\/orders\/([^/]+)\/refund-estimate$/);
  return match ? match[1] : null;
}

export async function handleOrders({ request, env, url, respond }) {
  if (!url.pathname.startsWith("/api/orders")) {
    if (url.pathname === "/api/packages" && request.method === "GET") {
      let db;
      try {
        db = requireDb(env);
      } catch (error) {
        return respond(500, { ok: false, error: "missing_db" });
      }
      const { results } = await listServiceProducts(db, { itemType: "package" });
      const packages = (results || []).map((row) => ({
        ...row,
        price: Number(row.price || 0),
        features: row.features ? String(row.features).split("|") : [],
      }));
      return respond(200, { ok: true, packages });
    }
    return null;
  }

  if (url.pathname === "/api/orders" && request.method === "GET") {
    const auth = await requireAuth(request, env);
    if (!auth.ok) {
      return respond(auth.status, { ok: false, error: auth.error });
    }

    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }

    const { results } = await listOrdersByUser(db, auth.userId, 10);
    const refreshed = await Promise.all(
      (results || []).map((order) => expireOrderIfNeeded(db, order))
    );
    const orders = refreshed.map(toOrderSummary).filter(Boolean);
    return respond(200, { ok: true, orders });
  }

  const refundEstimateOrderId = matchRefundEstimatePath(url.pathname);
  if (refundEstimateOrderId && request.method === "GET") {
    const auth = await requireAuth(request, env);
    if (!auth.ok) {
      return respond(auth.status, { ok: false, error: auth.error });
    }

    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }

    const order = await findOrderByUser(db, refundEstimateOrderId, auth.userId);
    if (!order) {
      return respond(404, { ok: false, error: "order_not_found" });
    }

    const refund = calculateRefund({ order });
    const refunded = Number(order.amount_refunded || 0);
    const remaining = Math.max(0, refund.refundable_amount - refunded);

    return respond(200, {
      ok: true,
      refund: {
        ...refund,
        refundable_amount: remaining,
        amount_refunded: refunded,
      },
    });
  }

  const orderMatch = url.pathname.match(/^\/api\/orders\/([^/]+)$/);
  if (orderMatch && request.method === "GET") {
    const auth = await requireAuth(request, env);
    if (!auth.ok) {
      return respond(auth.status, { ok: false, error: auth.error });
    }

    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }

    const orderId = orderMatch[1];
    const order = await findOrderByUser(db, orderId, auth.userId);
    if (!order) {
      return respond(404, { ok: false, error: "order_not_found" });
    }
    const refreshed = await expireOrderIfNeeded(db, order);
    return respond(200, { ok: true, order: refreshed });
  }

  if (url.pathname === "/api/orders" && request.method === "POST") {
    const auth = await requireAuth(request, env);
    if (!auth.ok) {
      return respond(auth.status, { ok: false, error: auth.error });
    }
    const body = await readJson(request);
    const input = normalizeOrderInput(body || {});
    if (!input.idempotencyKey) {
      return respond(400, { ok: false, error: "idempotency_required" });
    }
    if (!input.itemType || !input.itemId || !input.currency || !input.amountOriginal) {
      return respond(400, { ok: false, error: "missing_fields" });
    }
    if (!input.termsVersion || !input.termsAgreedAt) {
      return respond(400, { ok: false, error: "terms_required" });
    }

    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }
    try {
      await requireProfile(db, auth.userId);
    } catch (error) {
      return respond(400, { ok: false, error: "profile_required" });
    }

    const existing = await findOrderByIdempotency(db, input.idempotencyKey);
    if (existing) {
      return respond(200, { ok: true, order: existing, reused: true });
    }

    const coupon = await resolveCoupon(db, {
      code: input.couponCode,
      refChannel: input.refChannel,
    });
    const amounts = applyCoupon(input.amountOriginal, coupon);
    const openOrder = await findOpenOrderForUserItem(
      db,
      auth.userId,
      input.itemType,
      input.itemId
    );
    if (openOrder) {
      const matchesCoupon = (openOrder.coupon_id || null) === (coupon?.id || null);
      const matchesAmounts =
        Number(openOrder.amount_original) === amounts.original &&
        Number(openOrder.discount_amount) === amounts.discount &&
        Number(openOrder.amount_paid) === amounts.paid;
      const matchesCurrency = String(openOrder.currency) === String(input.currency);
      const matchesRef = String(openOrder.ref_channel || "") === String(input.refChannel || "");

      if (matchesCoupon && matchesAmounts && matchesCurrency && matchesRef) {
        return respond(200, { ok: true, order: openOrder, reused: true });
      }
    }

    const serviceProduct = await findServiceProduct(db, {
      itemType: input.itemType,
      itemId: input.itemId,
    });
    if (!serviceProduct?.refund_policy_type) {
      return respond(400, { ok: false, error: "service_product_not_configured" });
    }
    if (serviceProduct.terms_version && serviceProduct.terms_version !== input.termsVersion) {
      return respond(400, { ok: false, error: "terms_version_mismatch" });
    }

    const order = await insertOrder(db, {
      userId: auth.userId,
      itemType: input.itemType,
      itemId: input.itemId,
      amountOriginal: amounts.original,
      discountAmount: amounts.discount,
      amountPaid: amounts.paid,
      currency: input.currency,
      refChannel: input.refChannel,
      couponId: coupon?.id || null,
      intakeSummary: input.intakeSummary || "",
      refundPolicyType: String(serviceProduct.refund_policy_type || "").toUpperCase(),
      termsVersion: input.termsVersion,
      termsAgreedAt: input.termsAgreedAt,
      status: "created",
      idempotencyKey: input.idempotencyKey,
    });

    if (coupon?.id) {
      await incrementCouponUsage(db, coupon.id);
    }

    return respond(201, { ok: true, order });
  }

  const profileOrderId = matchProfilePath(url.pathname);
  if (profileOrderId && request.method === "GET") {
    const auth = await requireAuth(request, env);
    if (!auth.ok) {
      return respond(auth.status, { ok: false, error: auth.error });
    }

    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }

    const order = await findOrderByUser(db, profileOrderId, auth.userId);
    if (!order) {
      return respond(404, { ok: false, error: "order_not_found" });
    }

    const fallbackProfile = await db
      .prepare(
        "SELECT name, gender, birth_date, contact_info, companions, emergency_contact, email, checkup_date FROM user_profiles WHERE user_id = ?"
      )
      .bind(order.user_id)
      .first();
    const fallbackUser = await db
      .prepare("SELECT name FROM users WHERE id = ?")
      .bind(order.user_id)
      .first();
    const profile = await db
      .prepare("SELECT * FROM order_profiles WHERE order_id = ? ORDER BY created_at DESC LIMIT 1")
      .bind(profileOrderId)
      .first();

    if (!profile && !fallbackProfile && !fallbackUser) {
      return respond(404, { ok: false, error: "order_profile_not_found" });
    }

    const mergedProfile = profile ? { ...profile } : {};
    const fallback = fallbackProfile || fallbackUser || {};
    ["name", "gender", "birth_date", "contact_info", "companions", "emergency_contact", "email", "checkup_date"].forEach(
      (key) => {
        const value = profile?.[key];
        if (!value && fallback[key]) {
          mergedProfile[key] = fallback[key];
        }
      }
    );

    return respond(200, { ok: true, profile: mergedProfile });
  }
  if (profileOrderId && request.method === "POST") {
    const body = await readJson(request);
    const profile = normalizeProfile(body || {});
    if (!profile.email) {
      return respond(400, { ok: false, error: "email_required" });
    }

    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }

    const order = await findOrderById(db, profileOrderId);
    if (!order) {
      return respond(404, { ok: false, error: "order_not_found" });
    }

    const profileRow = await insertOrderProfile(db, order.id, profile);
    if (profile?.checkup_date) {
      await updateOrderServiceStartDate(db, order.id, profile.checkup_date);
    }
    await updateOrderStatus(db, order.id, "profile_completed");
    await updateUserFromProfile(db, order.user_id, profile);

    return respond(200, { ok: true, profile: profileRow });
  }

  const cancelOrderId = matchCancelPath(url.pathname);
  if (cancelOrderId && request.method === "POST") {
    const auth = await requireAuth(request, env);
    if (!auth.ok) {
      return respond(auth.status, { ok: false, error: auth.error });
    }

    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }

    const order = await findOrderByUser(db, cancelOrderId, auth.userId);
    if (!order) {
      return respond(404, { ok: false, error: "order_not_found" });
    }
    if (isOrderPaymentExpired(order)) {
      await updateOrderStatus(db, order.id, "payment_expired");
      return respond(400, { ok: false, error: "order_expired" });
    }
    if (!["created", "awaiting_payment"].includes(order.status)) {
      return respond(400, { ok: false, error: "cancel_not_allowed" });
    }
    const updated = await updateOrderStatus(db, order.id, "cancelled");
    return respond(200, { ok: true, order: updated });
  }

  const refundOrderId = matchRefundPath(url.pathname);
  if (refundOrderId && request.method === "POST") {
    const auth = await requireAuth(request, env);
    if (!auth.ok) {
      return respond(auth.status, { ok: false, error: auth.error });
    }
    const body = await readJson(request);
    const reason = body?.reason ? String(body.reason).trim() : "";
    if (!reason) {
      return respond(400, { ok: false, error: "refund_reason_required" });
    }

    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }

    const order = await findOrderByUser(db, refundOrderId, auth.userId);
    if (!order) {
      return respond(404, { ok: false, error: "order_not_found" });
    }
    if (!["paid", "paid_pending_profile"].includes(order.status)) {
      return respond(400, { ok: false, error: "refund_not_allowed" });
    }
    const refundCheck = calculateRefund({ order });
    if (refundCheck.status === "not_refundable" || refundCheck.status === "missing_data") {
      return respond(400, { ok: false, error: "refund_not_allowed" });
    }

    const existing = await db
      .prepare(
        "SELECT * FROM refund_requests WHERE order_id = ? AND status IN ('pending','approved') LIMIT 1"
      )
      .bind(order.id)
      .first();
    if (existing) {
      return respond(409, { ok: false, error: "refund_request_exists" });
    }

    const now = new Date().toISOString();
    const refundId = crypto.randomUUID();
    await db
      .prepare(
        "INSERT INTO refund_requests (id, order_id, user_id, reason, status, admin_note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(refundId, order.id, auth.userId, reason, "pending", null, now, now)
      .run();

    const updated = await updateOrderStatus(db, order.id, "refund_requested");
    return respond(201, {
      ok: true,
      order: updated,
      refund_request: {
        id: refundId,
        order_id: order.id,
        user_id: auth.userId,
        reason,
        status: "pending",
        admin_note: null,
        created_at: now,
        updated_at: now,
      },
    });
  }

  return null;
}
