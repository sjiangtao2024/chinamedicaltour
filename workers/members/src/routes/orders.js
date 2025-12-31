import {
  findOrderById,
  findOrderByIdempotency,
  findOrderByUser,
  insertOrder,
  listOrdersByUser,
  normalizeOrderInput,
  requireProfile,
  toOrderSummary,
  updateOrderStatus,
} from "../lib/orders.js";
import { applyCoupon, incrementCouponUsage, resolveCoupon } from "../lib/coupons.js";
import { insertOrderProfile, normalizeProfile, updateUserFromProfile } from "../lib/profile.js";
import { requireAuth, requireDb, readJson } from "../lib/request.js";

function matchProfilePath(pathname) {
  const match = pathname.match(/^\/api\/orders\/([^/]+)\/profile$/);
  return match ? match[1] : null;
}

export async function handleOrders({ request, env, url, respond }) {
  if (!url.pathname.startsWith("/api/orders")) {
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
    const orders = (results || []).map(toOrderSummary).filter(Boolean);
    return respond(200, { ok: true, orders });
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
    return respond(200, { ok: true, order });
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
      status: "created",
      idempotencyKey: input.idempotencyKey,
    });

    if (coupon?.id) {
      await incrementCouponUsage(db, coupon.id);
    }

    return respond(201, { ok: true, order });
  }

  const profileOrderId = matchProfilePath(url.pathname);
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
    await updateOrderStatus(db, order.id, "profile_completed");
    await updateUserFromProfile(db, order.user_id, profile);

    return respond(200, { ok: true, profile: profileRow });
  }

  return null;
}
