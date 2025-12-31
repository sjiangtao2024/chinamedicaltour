import { findOrderById, updateOrderStatus } from "../lib/orders.js";
import { listPaypalTransactions } from "../lib/paypal.js";
import { listAdminOrders, reconcilePaypalTransactions } from "../lib/admin.js";
import { requireAdmin, requireDb, readJson } from "../lib/request.js";

export async function handleAdmin({ request, env, url, respond }) {
  if (!url.pathname.startsWith("/api/admin")) {
    return null;
  }

  if (url.pathname === "/api/admin/me" && request.method === "GET") {
    const admin = await requireAdmin(request, env);
    if (!admin.ok) {
      return respond(admin.status, { ok: false, error: admin.error });
    }
    return respond(200, {
      ok: true,
      user_id: admin.userId,
      role: admin.admin?.role || "admin",
    });
  }

  if (url.pathname === "/api/admin/orders" && request.method === "GET") {
    const admin = await requireAdmin(request, env);
    if (!admin.ok) {
      return respond(admin.status, { ok: false, error: admin.error });
    }
    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }

    const status = url.searchParams.get("status")?.trim();
    const userId = url.searchParams.get("user_id")?.trim();
    const from = url.searchParams.get("from")?.trim();
    const to = url.searchParams.get("to")?.trim();
    const limitRaw = Number(url.searchParams.get("limit") || 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

    let fromIso = "";
    if (from) {
      const fromDate = new Date(from);
      if (Number.isNaN(fromDate.getTime())) {
        return respond(400, { ok: false, error: "invalid_from" });
      }
      fromIso = fromDate.toISOString();
    }
    let toIso = "";
    if (to) {
      const toDate = new Date(to);
      if (Number.isNaN(toDate.getTime())) {
        return respond(400, { ok: false, error: "invalid_to" });
      }
      toIso = toDate.toISOString();
    }

    const { results } = await listAdminOrders(db, {
      status,
      userId,
      from: fromIso || "",
      to: toIso || "",
      limit,
    });
    return respond(200, { ok: true, orders: results || [] });
  }

  const adminOrderMatch = url.pathname.match(/^\/api\/admin\/orders\/([^/]+)$/);
  if (adminOrderMatch && request.method === "GET") {
    const admin = await requireAdmin(request, env);
    if (!admin.ok) {
      return respond(admin.status, { ok: false, error: admin.error });
    }
    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }
    const orderId = adminOrderMatch[1];
    const order = await findOrderById(db, orderId);
    if (!order) {
      return respond(404, { ok: false, error: "order_not_found" });
    }
    return respond(200, { ok: true, order });
  }

  if (adminOrderMatch && request.method === "PATCH") {
    const admin = await requireAdmin(request, env);
    if (!admin.ok) {
      return respond(admin.status, { ok: false, error: admin.error });
    }
    const body = await readJson(request);
    const status = body?.status ? String(body.status).trim() : "";
    if (!status) {
      return respond(400, { ok: false, error: "status_required" });
    }
    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }
    const orderId = adminOrderMatch[1];
    const updated = await updateOrderStatus(db, orderId, status);
    if (!updated) {
      return respond(404, { ok: false, error: "order_not_found" });
    }
    return respond(200, { ok: true, order: updated });
  }

  if (url.pathname === "/api/admin/payments" && request.method === "GET") {
    const admin = await requireAdmin(request, env);
    if (!admin.ok) {
      return respond(admin.status, { ok: false, error: admin.error });
    }
    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }
    if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_SECRET) {
      return respond(500, { ok: false, error: "missing_paypal_credentials" });
    }

    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const from = url.searchParams.get("from") || defaultFrom.toISOString();
    const to = url.searchParams.get("to") || now.toISOString();
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime())) {
      return respond(400, { ok: false, error: "invalid_from" });
    }
    if (Number.isNaN(toDate.getTime())) {
      return respond(400, { ok: false, error: "invalid_to" });
    }

    const { results } = await db
      .prepare("SELECT * FROM orders WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC")
      .bind(fromDate.toISOString(), toDate.toISOString())
      .all();
    const orders = results || [];
    let transactions = [];
    let paypalError = null;
    try {
      const paypalReport = await listPaypalTransactions({
        clientId: env.PAYPAL_CLIENT_ID,
        secret: env.PAYPAL_SECRET,
        startDate: fromDate.toISOString(),
        endDate: toDate.toISOString(),
      });
      transactions = paypalReport?.transaction_details || [];
    } catch (error) {
      const message = String(error?.message || "");
      if (message.startsWith("paypal_report_error:403")) {
        paypalError = "not_authorized";
      } else {
        return respond(502, { ok: false, error: "paypal_report_error" });
      }
    }
    const reconciliation = reconcilePaypalTransactions(orders, transactions);

    return respond(200, {
      ok: true,
      orders,
      paypal: {
        transactions,
        error: paypalError,
      },
      reconciliation,
    });
  }

  if (url.pathname === "/api/admin/coupons" && request.method === "POST") {
    const admin = await requireAdmin(request, env);
    if (!admin.ok) {
      return respond(admin.status, { ok: false, error: admin.error });
    }
    const body = await readJson(request);
    const codeRaw = body?.code ? String(body.code) : "";
    const code = codeRaw.trim().replace(/\s+/g, "").toUpperCase();
    if (!code) {
      return respond(400, { ok: false, error: "coupon_code_required" });
    }
    const refChannel = body?.ref_channel ? String(body.ref_channel).trim() : "";
    if (!refChannel) {
      return respond(400, { ok: false, error: "ref_channel_required" });
    }
    const type = body?.type ? String(body.type).trim().toLowerCase() : "percent";
    if (!["percent", "fixed"].includes(type)) {
      return respond(400, { ok: false, error: "invalid_coupon_type" });
    }
    const value = Number(body?.value || 0);
    if (!Number.isFinite(value) || value <= 0) {
      return respond(400, { ok: false, error: "invalid_coupon_value" });
    }
    if (type === "percent" && value > 100) {
      return respond(400, { ok: false, error: "invalid_coupon_value" });
    }
    const defaultUsageLimit = 200;
    const usageLimit =
      body?.usage_limit != null && body?.usage_limit !== ""
        ? Number(body.usage_limit)
        : defaultUsageLimit;
    if (!Number.isFinite(usageLimit) || usageLimit <= 0) {
      return respond(400, { ok: false, error: "invalid_usage_limit" });
    }
    const now = new Date();
    const validFromInput = body?.valid_from ? new Date(body.valid_from) : now;
    if (Number.isNaN(validFromInput.getTime())) {
      return respond(400, { ok: false, error: "invalid_valid_from" });
    }
    const defaultValidTo = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const validToInput = body?.valid_to ? new Date(body.valid_to) : defaultValidTo;
    if (Number.isNaN(validToInput.getTime())) {
      return respond(400, { ok: false, error: "invalid_valid_to" });
    }
    if (validToInput <= validFromInput) {
      return respond(400, { ok: false, error: "invalid_valid_window" });
    }
    const maxDiscountRaw = body?.max_discount;
    const maxDiscount =
      maxDiscountRaw == null || maxDiscountRaw === ""
        ? null
        : Number(maxDiscountRaw);
    if (maxDiscount != null && (!Number.isFinite(maxDiscount) || maxDiscount <= 0)) {
      return respond(400, { ok: false, error: "invalid_max_discount" });
    }
    const scope = body?.scope ? String(body.scope).trim() : null;

    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }

    const existing = await db
      .prepare("SELECT id FROM coupons WHERE code = ?")
      .bind(code)
      .first();
    if (existing) {
      return respond(409, { ok: false, error: "coupon_code_exists" });
    }

    const id = crypto.randomUUID();
    const createdAt = now.toISOString();
    await db
      .prepare(
        "INSERT INTO coupons (id, code, type, value, ref_channel, scope, valid_from, valid_to, usage_limit, used_count, max_discount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        id,
        code,
        type,
        Math.round(value),
        refChannel,
        scope,
        validFromInput.toISOString(),
        validToInput.toISOString(),
        Math.round(usageLimit),
        0,
        type === "percent" ? (maxDiscount != null ? Math.round(maxDiscount) : null) : null,
        createdAt
      )
      .run();

    return respond(201, {
      ok: true,
      coupon: {
        id,
        code,
        type,
        value: Math.round(value),
        ref_channel: refChannel,
        scope,
        valid_from: validFromInput.toISOString(),
        valid_to: validToInput.toISOString(),
        usage_limit: Math.round(usageLimit),
        used_count: 0,
        max_discount: type === "percent" ? (maxDiscount != null ? Math.round(maxDiscount) : null) : null,
        created_at: createdAt,
      },
    });
  }

  return null;
}
