import { findOrderById, updateOrderServiceStatus, updateOrderStatus } from "../lib/orders.js";
import { listPaypalTransactions, parsePaypalFee, refundPaypalCapture } from "../lib/paypal.js";
import {
  countAdminMembers,
  findAdminOrderDetails,
  listAdminMembers,
  listAdminOrders,
  reconcilePaypalTransactions,
} from "../lib/admin.js";
import { calculateRefund } from "../lib/refunds.js";
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

  if (url.pathname === "/api/admin/members" && request.method === "GET") {
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
    const query = url.searchParams.get("q")?.trim();
    const sort = url.searchParams.get("sort")?.trim();
    const from = url.searchParams.get("from")?.trim();
    const to = url.searchParams.get("to")?.trim();
    const limitRaw = Number(url.searchParams.get("limit") || 50);
    const offsetRaw = Number(url.searchParams.get("offset") || 0);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

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

    const [count, list] = await Promise.all([
      countAdminMembers(db, { query, from: fromIso, to: toIso }),
      listAdminMembers(db, { query, from: fromIso, to: toIso, sort, limit, offset }),
    ]);

    return respond(200, {
      ok: true,
      total: count,
      members: list?.results || [],
    });
  }

  if (url.pathname === "/api/admin/smart-cs-summary" && request.method === "GET") {
    const admin = await requireAdmin(request, env);
    if (!admin.ok) {
      return respond(admin.status, { ok: false, error: admin.error });
    }
    if (!env.SMART_CS_ADMIN_TOKEN) {
      return respond(500, { ok: false, error: "missing_smart_cs_admin_token" });
    }
    const base = env.SMART_CS_ADMIN_URL || "https://api.chinamedicaltour.org";
    const params = new URLSearchParams();
    const date = url.searchParams.get("date");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const intent = url.searchParams.get("intent");
    const limit = url.searchParams.get("limit");
    const offset = url.searchParams.get("offset");
    if (date) params.set("date", date);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (intent) params.set("intent", intent);
    if (limit) params.set("limit", limit);
    if (offset) params.set("offset", offset);

    const summaryUrl = `${base.replace(/\/$/, "")}/admin/summary${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    let response;
    try {
      response = await fetch(summaryUrl, {
        headers: {
          Authorization: `Bearer ${env.SMART_CS_ADMIN_TOKEN}`,
        },
      });
    } catch (error) {
      return respond(502, { ok: false, error: "smart_cs_unreachable" });
    }
    const payload = await response.json().catch(() => ({}));
    return respond(response.ok ? 200 : response.status, payload);
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
    const order = await findAdminOrderDetails(db, orderId);
    if (!order) {
      return respond(404, { ok: false, error: "order_not_found" });
    }
    return respond(200, { ok: true, order });
  }

  const adminRefundEstimateMatch = url.pathname.match(
    /^\/api\/admin\/orders\/([^/]+)\/refund-estimate$/
  );
  if (adminRefundEstimateMatch && request.method === "GET") {
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

    const orderId = adminRefundEstimateMatch[1];
    const order = await findOrderById(db, orderId);
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

  if (adminOrderMatch && request.method === "PATCH") {
    const admin = await requireAdmin(request, env);
    if (!admin.ok) {
      return respond(admin.status, { ok: false, error: admin.error });
    }
    const body = await readJson(request);
    const status = body?.status ? String(body.status).trim() : "";
    const serviceStatus = body?.service_status ? String(body.service_status).trim() : "";
    if (!status && !serviceStatus) {
      return respond(400, { ok: false, error: "status_required" });
    }
    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }
    const orderId = adminOrderMatch[1];
    let updated = null;
    if (status) {
      updated = await updateOrderStatus(db, orderId, status);
    }
    if (serviceStatus) {
      updated = await updateOrderServiceStatus(db, orderId, serviceStatus);
    }
    if (!updated) {
      return respond(404, { ok: false, error: "order_not_found" });
    }
    return respond(200, { ok: true, order: updated });
  }

  const refundIssueMatch = url.pathname.match(/^\/api\/admin\/orders\/([^/]+)\/refund$/);
  if (refundIssueMatch && request.method === "POST") {
    const admin = await requireAdmin(request, env);
    if (!admin.ok) {
      return respond(admin.status, { ok: false, error: admin.error });
    }
    const body = await readJson(request);
    const amountRaw = body?.amount;
    const reason = body?.reason ? String(body.reason).trim() : "";

    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }
    if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_SECRET) {
      return respond(500, { ok: false, error: "missing_paypal_credentials" });
    }

    const orderId = refundIssueMatch[1];
    const order = await findOrderById(db, orderId);
    if (!order) {
      return respond(404, { ok: false, error: "order_not_found" });
    }
    if (!order.paypal_capture_id) {
      return respond(400, { ok: false, error: "paypal_capture_missing" });
    }

    const paidAmount = Number(order.amount_paid || 0);
    const refundedAmount = Number(order.amount_refunded || 0);
    const remaining = Math.max(0, paidAmount - refundedAmount);
    const requestedAmount =
      amountRaw == null ? null : Number.isFinite(Number(amountRaw)) ? Number(amountRaw) : NaN;
    const refundAmount = requestedAmount == null ? remaining : Math.round(requestedAmount);

    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      return respond(400, { ok: false, error: "refund_amount_invalid" });
    }
    if (refundAmount > remaining) {
      return respond(400, { ok: false, error: "refund_amount_exceeds_remaining" });
    }

    let refund;
    try {
      refund = await refundPaypalCapture({
        clientId: env.PAYPAL_CLIENT_ID,
        secret: env.PAYPAL_SECRET,
        captureId: order.paypal_capture_id,
        amount: refundAmount,
        currency: order.currency,
        noteToPayer: reason || undefined,
        invoiceId: order.id,
      });
    } catch (error) {
      return respond(502, { ok: false, error: "paypal_refund_error" });
    }

    const refundFee = parsePaypalFee(refund);
    const now = new Date().toISOString();
    const refundId = crypto.randomUUID();
    const refundStatus = String(refund?.status || "COMPLETED");
    await db
      .prepare(
        "INSERT INTO payment_refunds (id, order_id, user_id, amount, currency, gateway_fee, gateway_refund_id, status, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        refundId,
        order.id,
        order.user_id,
        refundAmount,
        order.currency,
        refundFee,
        refund?.id || null,
        refundStatus,
        reason || null,
        now
      )
      .run();

    const nextRefunded = refundedAmount + refundAmount;
    const nextStatus = nextRefunded >= paidAmount ? "refunded" : "refund_partial";
    await db
      .prepare(
        "UPDATE orders SET amount_refunded = ?, status = ?, updated_at = ?, service_status = NULL WHERE id = ?"
      )
      .bind(nextRefunded, nextStatus, now, order.id)
      .run();

    const updatedOrder = {
      ...order,
      amount_refunded: nextRefunded,
      status: nextStatus,
      service_status: null,
    };

    return respond(200, {
      ok: true,
      order: updatedOrder,
      refund: {
        id: refundId,
        order_id: order.id,
        amount: refundAmount,
        currency: order.currency,
        status: refundStatus,
        gateway_refund_id: refund?.id || null,
      },
    });
  }

  if (url.pathname === "/api/admin/refund-requests" && request.method === "GET") {
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

    const limitRaw = Number(url.searchParams.get("limit") || 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
    const offsetRaw = Number(url.searchParams.get("offset") || 0);
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

    const { results } = await db
      .prepare(
        "SELECT id, order_id, user_id, reason, status, admin_note, created_at, updated_at FROM refund_requests ORDER BY created_at DESC LIMIT ? OFFSET ?"
      )
      .bind(limit, offset)
      .all();

    return respond(200, { ok: true, requests: results || [] });
  }

  const refundMatch = url.pathname.match(/^\/api\/admin\/refund-requests\/([^/]+)$/);
  if (refundMatch && request.method === "PATCH") {
    const admin = await requireAdmin(request, env);
    if (!admin.ok) {
      return respond(admin.status, { ok: false, error: admin.error });
    }
    const body = await readJson(request);
    const status = body?.status ? String(body.status).trim().toLowerCase() : "";
    if (!status || !["approved", "rejected", "completed"].includes(status)) {
      return respond(400, { ok: false, error: "invalid_status" });
    }
    const adminNote = body?.admin_note ? String(body.admin_note).trim() : null;

    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }

    const refundId = refundMatch[1];
    const existing = await db
      .prepare(
        "SELECT id, order_id, user_id, reason, status, admin_note, created_at, updated_at FROM refund_requests WHERE id = ?"
      )
      .bind(refundId)
      .first();
    if (!existing) {
      return respond(404, { ok: false, error: "refund_request_not_found" });
    }

    const now = new Date().toISOString();
    await db
      .prepare("UPDATE refund_requests SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?")
      .bind(status, adminNote, now, refundId)
      .run();

    const orderStatusMap = {
      approved: "refund_approved",
      rejected: "refund_rejected",
      completed: "refunded",
    };
    const updatedOrder = await updateOrderStatus(db, existing.order_id, orderStatusMap[status]);
    const updatedRequest = await db
      .prepare(
        "SELECT id, order_id, user_id, reason, status, admin_note, created_at, updated_at FROM refund_requests WHERE id = ?"
      )
      .bind(refundId)
      .first();

    return respond(200, { ok: true, request: updatedRequest, order: updatedOrder });
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

  if (url.pathname === "/api/admin/coupons" && request.method === "GET") {
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

    const limitRaw = Number(url.searchParams.get("limit") || 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
    const offsetRaw = Number(url.searchParams.get("offset") || 0);
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

    const totalRow = await db.prepare("SELECT COUNT(*) as count FROM coupons").first();
    const total = Number(totalRow?.count || 0);
    const { results } = await db
      .prepare(
        "SELECT id, code, type, value, ref_channel, scope, valid_from, valid_to, usage_limit, used_count, max_discount, issuer_name, issuer_contact, created_at FROM coupons ORDER BY created_at DESC LIMIT ? OFFSET ?"
      )
      .bind(limit, offset)
      .all();

    return respond(200, {
      ok: true,
      coupons: results || [],
      meta: { total, limit, offset },
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
    const issuerName = body?.issuer_name ? String(body.issuer_name).trim() : "";
    if (!issuerName) {
      return respond(400, { ok: false, error: "issuer_name_required" });
    }
    const issuerContact = body?.issuer_contact ? String(body.issuer_contact).trim() : "";
    if (!issuerContact) {
      return respond(400, { ok: false, error: "issuer_contact_required" });
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
    let scope = null;
    if (body?.scope != null && body?.scope !== "") {
      const rawScope = body.scope;
      let parsed = [];
      if (Array.isArray(rawScope)) {
        parsed = rawScope;
      } else {
        try {
          parsed = JSON.parse(String(rawScope));
        } catch (error) {
          return respond(400, { ok: false, error: "invalid_scope" });
        }
      }
      if (!Array.isArray(parsed)) {
        return respond(400, { ok: false, error: "invalid_scope" });
      }
      const list = parsed.filter((item) => typeof item === "string" && item.trim());
      if (list.length > 0) {
        scope = JSON.stringify(list);
      }
    }

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
        "INSERT INTO coupons (id, code, type, value, ref_channel, scope, valid_from, valid_to, usage_limit, used_count, max_discount, issuer_name, issuer_contact, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
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
        issuerName,
        issuerContact,
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
        issuer_name: issuerName,
        issuer_contact: issuerContact,
        created_at: createdAt,
      },
    });
  }

  return null;
}
