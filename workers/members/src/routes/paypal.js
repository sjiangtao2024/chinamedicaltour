import { capturePaypalOrder, createPaypalOrder, verifyWebhookSignature } from "../lib/paypal.js";
import { findOrderById, updateOrderPayment } from "../lib/orders.js";
import { requireAuth, requireDb, readJson } from "../lib/request.js";

export async function handlePaypal({ request, env, url, respond }) {
  if (!url.pathname.startsWith("/api/paypal")) {
    return null;
  }

  if (url.pathname === "/api/paypal/create" && request.method === "POST") {
    const auth = await requireAuth(request, env);
    if (!auth.ok) {
      return respond(auth.status, { ok: false, error: auth.error });
    }
    const body = await readJson(request);
    const orderId = body?.order_id ? String(body.order_id).trim() : "";
    if (!orderId) {
      return respond(400, { ok: false, error: "order_id_required" });
    }

    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }

    const order = await findOrderById(db, orderId);
    if (!order) {
      return respond(404, { ok: false, error: "order_not_found" });
    }
    if (order.user_id !== auth.userId) {
      return respond(403, { ok: false, error: "forbidden" });
    }

    const returnUrl = env.PAYPAL_RETURN_URL || url.origin + "/checkout.html?paypal=return";
    const cancelUrl = env.PAYPAL_CANCEL_URL || url.origin + "/checkout.html?paypal=cancel";
    const paypalOrder = await createPaypalOrder({
      clientId: env.PAYPAL_CLIENT_ID,
      secret: env.PAYPAL_SECRET,
      amount: order.amount_paid,
      currency: order.currency,
      customId: order.id,
      returnUrl,
      cancelUrl,
    });

    const updated = await updateOrderPayment(db, order.id, {
      paypalOrderId: paypalOrder.id,
      status: "awaiting_payment",
    });

    return respond(200, {
      ok: true,
      order: updated,
      paypal_order_id: paypalOrder.id,
      links: paypalOrder.links,
    });
  }

  if (url.pathname === "/api/paypal/capture" && request.method === "POST") {
    const auth = await requireAuth(request, env);
    if (!auth.ok) {
      return respond(auth.status, { ok: false, error: auth.error });
    }
    const body = await readJson(request);
    const orderId = body?.order_id ? String(body.order_id).trim() : "";
    if (!orderId) {
      return respond(400, { ok: false, error: "order_id_required" });
    }

    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }

    const order = await findOrderById(db, orderId);
    if (!order) {
      return respond(404, { ok: false, error: "order_not_found" });
    }
    if (order.user_id !== auth.userId) {
      return respond(403, { ok: false, error: "forbidden" });
    }
    if (!order.paypal_order_id) {
      return respond(404, { ok: false, error: "paypal_order_missing" });
    }

    const capture = await capturePaypalOrder({
      clientId: env.PAYPAL_CLIENT_ID,
      secret: env.PAYPAL_SECRET,
      orderId: order.paypal_order_id,
    });
    const captureId = capture?.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;

    const updated = await updateOrderPayment(db, order.id, {
      paypalOrderId: order.paypal_order_id,
      paypalCaptureId: captureId,
      status: "paid",
    });

    return respond(200, { ok: true, order: updated, capture });
  }

  if (url.pathname === "/api/paypal/webhook" && request.method === "POST") {
    const raw = await request.text();
    let event;
    try {
      event = JSON.parse(raw);
    } catch (error) {
      return respond(400, { ok: false, error: "invalid_json" });
    }

    const verified = await verifyWebhookSignature({
      clientId: env.PAYPAL_CLIENT_ID,
      secret: env.PAYPAL_SECRET,
      webhookId: env.PAYPAL_WEBHOOK_ID,
      headers: request.headers,
      body: event,
    });

    if (!verified) {
      return respond(400, { ok: false, error: "invalid_signature" });
    }

    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }

    const eventId = event?.id ? String(event.id) : "";
    const eventType = event?.event_type ? String(event.event_type) : "";
    const resource = event?.resource || {};
    const customId = resource?.custom_id ? String(resource.custom_id) : "";

    if (!eventId) {
      return respond(400, { ok: false, error: "missing_event_id" });
    }

    const existingEvent = await db
      .prepare("SELECT event_id FROM webhook_events WHERE event_id = ?")
      .bind(eventId)
      .first();
    if (existingEvent) {
      return respond(200, { ok: true, ignored: true });
    }

    const now = new Date().toISOString();
    const recordEvent = async (status, resourceId, error) =>
      db
        .prepare(
          "INSERT INTO webhook_events (event_id, event_type, resource_id, status, error, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(eventId, eventType, resourceId || null, status, error || null, now)
        .run();

    if (!customId) {
      await recordEvent("ignored", null, "missing_custom_id");
      return respond(200, { ok: true, ignored: true });
    }

    if (eventType === "CHECKOUT.ORDER.APPROVED") {
      const order = await findOrderById(db, customId);
      if (!order) {
        await recordEvent("failed", customId, "order_not_found");
        return respond(404, { ok: false, error: "order_not_found" });
      }
      await updateOrderPayment(db, customId, {
        paypalOrderId: resource.id,
        status: "awaiting_capture",
      });
      await recordEvent("processed", customId, null);
      return respond(200, { ok: true });
    }
    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const order = await findOrderById(db, customId);
      if (!order) {
        await recordEvent("failed", customId, "order_not_found");
        return respond(404, { ok: false, error: "order_not_found" });
      }

      const paidAmountStr =
        resource?.amount?.value ||
        resource?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ||
        "0";
      const paidCurrency =
        resource?.amount?.currency_code ||
        resource?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code ||
        "";
      const paidAmount = Number.parseFloat(paidAmountStr);
      if (!Number.isFinite(paidAmount)) {
        await recordEvent("failed", customId, "invalid_amount");
        return respond(400, { ok: false, error: "amount_invalid" });
      }

      const paidAmountCents = Math.round(paidAmount * 100);
      const normalizedCurrency = String(paidCurrency || "").toUpperCase();
      const orderCurrency = String(order.currency || "").toUpperCase();
      if (!normalizedCurrency || normalizedCurrency !== orderCurrency) {
        await recordEvent("failed", customId, "currency_mismatch");
        return respond(400, { ok: false, error: "currency_mismatch" });
      }
      if (paidAmountCents !== order.amount_paid) {
        await recordEvent("failed", customId, "amount_mismatch");
        return respond(400, { ok: false, error: "amount_mismatch" });
      }

      await updateOrderPayment(db, customId, {
        paypalCaptureId: resource.id,
        status: "paid_pending_profile",
      });
      await recordEvent("processed", customId, null);
      return respond(200, { ok: true });
    }

    await recordEvent("ignored", customId, "unhandled_event_type");
    return respond(200, { ok: true, ignored: true });
  }

  return null;
}
