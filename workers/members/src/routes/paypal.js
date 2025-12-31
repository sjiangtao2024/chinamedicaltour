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

    const resource = event.resource || {};
    const customId = resource.custom_id;
    if (customId) {
      let db;
      try {
        db = requireDb(env);
      } catch (error) {
        return respond(500, { ok: false, error: "missing_db" });
      }

      if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
        await updateOrderPayment(db, customId, {
          paypalOrderId: resource.id,
          status: "awaiting_capture",
        });
      }
      if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
        await updateOrderPayment(db, customId, {
          paypalCaptureId: resource.id,
          status: "paid_pending_profile",
        });
      }
    }

    return respond(200, { ok: true });
  }

  return null;
}
