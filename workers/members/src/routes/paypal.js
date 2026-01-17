import {
  capturePaypalOrder,
  createPaypalOrder,
  parsePaypalFee,
  verifyWebhookSignature,
} from "../lib/paypal.js";
import { buildRefundConfirmationEmail, sendRefundConfirmationEmail } from "../lib/email.js";
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
    const paymentGatewayFee = parsePaypalFee(capture);

    const updated = await updateOrderPayment(db, order.id, {
      paypalOrderId: order.paypal_order_id,
      paypalCaptureId: captureId,
      paymentGatewayFee: paymentGatewayFee ?? null,
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
    const recordWebhookEvent = async ({ id, type, resourceId, status, error }) =>
      db
        .prepare(
          "INSERT INTO webhook_events (event_id, event_type, resource_id, status, error, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(id, type, resourceId || null, status, error || null, now)
        .run();
    const recordEvent = async (status, resourceId, error) =>
      recordWebhookEvent({ id: eventId, type: eventType, resourceId, status, error });

    const buildPortalLink = (baseUrl, path) => {
      const base = baseUrl ? String(baseUrl).trim() : "";
      if (!base) {
        return "";
      }
      try {
        const url = new URL(base);
        url.pathname = path;
        url.search = "";
        url.hash = "";
        return url.toString();
      } catch (error) {
        return `${base.replace(/\/$/, "")}${path}`;
      }
    };

    const sendRefundEmailIfNeeded = async ({ order, refundId, refundAmount, refundStatus }) => {
      const emailEventId = `refund_email:${refundId}`;
      const existingEmailEvent = await db
        .prepare("SELECT event_id FROM webhook_events WHERE event_id = ?")
        .bind(emailEventId)
        .first();
      if (existingEmailEvent) {
        return;
      }

      const apiKey = env.RESEND_API_KEY ? String(env.RESEND_API_KEY).trim() : "";
      const from = env.ORDER_FROM_EMAIL
        ? String(env.ORDER_FROM_EMAIL).trim()
        : env.FROM_EMAIL
          ? String(env.FROM_EMAIL).trim()
          : "";
      if (!apiKey || !from) {
        await recordWebhookEvent({
          id: emailEventId,
          type: "refund_email",
          resourceId: order?.id,
          status: "ignored",
          error: "missing_email_config",
        });
        return;
      }

      const user = await db
        .prepare("SELECT email, name FROM users WHERE id = ?")
        .bind(order.user_id)
        .first();
      if (!user?.email) {
        await recordWebhookEvent({
          id: emailEventId,
          type: "refund_email",
          resourceId: order?.id,
          status: "ignored",
          error: "missing_recipient",
        });
        return;
      }

      const profile = await db
        .prepare("SELECT name FROM user_profiles WHERE user_id = ?")
        .bind(order.user_id)
        .first();
      const product = await db
        .prepare("SELECT name FROM service_products WHERE item_type = ? AND item_id = ?")
        .bind(order.item_type, order.item_id)
        .first();

      const orderAmount = Number(order.amount_paid || 0);
      const refundAmountValue = Number(refundAmount || 0);
      const feeAmount = Math.max(orderAmount - refundAmountValue, 0);
      const portalUrl = env.MEMBER_PORTAL_URL ? String(env.MEMBER_PORTAL_URL).trim() : "";
      const orderLink = buildPortalLink(portalUrl, `/orders/${order.id}`);
      const termsUrl = env.TERMS_URL
        ? String(env.TERMS_URL).trim()
        : buildPortalLink(portalUrl, "/terms.html");

      const email = buildRefundConfirmationEmail({
        recipientName: profile?.name || user?.name || "",
        orderId: order.id,
        orderAmount,
        refundAmount: refundAmountValue,
        feeAmount: feeAmount || null,
        currency: order.currency,
        refundStatus,
        productName: product?.name || "",
        orderLink,
        termsVersion: order.terms_version,
        termsUrl,
        supportEmail: env.SUPPORT_EMAIL ? String(env.SUPPORT_EMAIL).trim() : "",
        paymentChannel: order.payment_channel || "",
      });

      try {
        await sendRefundConfirmationEmail({
          apiKey,
          from,
          to: user.email,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });
        await recordWebhookEvent({
          id: emailEventId,
          type: "refund_email",
          resourceId: order.id,
          status: "processed",
          error: null,
        });
      } catch (error) {
        await recordWebhookEvent({
          id: emailEventId,
          type: "refund_email",
          resourceId: order.id,
          status: "failed",
          error: error?.message || "refund_email_failed",
        });
      }
    };

    const allowMissingCustomId = eventType === "PAYMENT.CAPTURE.REFUNDED";
    if (!customId && !allowMissingCustomId) {
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

      const paymentGatewayFee = parsePaypalFee(resource);
      const profile = await db
        .prepare("SELECT user_id FROM user_profiles WHERE user_id = ?")
        .bind(order.user_id)
        .first();
      const nextStatus = profile ? "paid" : "paid_pending_profile";
      await updateOrderPayment(db, customId, {
        paypalCaptureId: resource.id,
        paymentGatewayFee: paymentGatewayFee ?? null,
        status: nextStatus,
      });
      await recordEvent("processed", customId, null);
      return respond(200, { ok: true });
    }

    if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
      const refundId = resource?.id ? String(resource.id) : "";
      if (!refundId) {
        await recordEvent("failed", customId, "refund_id_missing");
        return respond(200, { ok: true, ignored: true });
      }

      const existingRefund = await db
        .prepare("SELECT * FROM payment_refunds WHERE gateway_refund_id = ?")
        .bind(refundId)
        .first();
      if (!existingRefund) {
        await recordEvent("ignored", refundId, "refund_not_found");
        return respond(200, { ok: true, ignored: true });
      }

      const refundStatus = String(resource?.status || "COMPLETED");
      const refundFee = parsePaypalFee(resource);
      await db
        .prepare(
          "UPDATE payment_refunds SET status = ?, gateway_fee = COALESCE(?, gateway_fee) WHERE gateway_refund_id = ?"
        )
        .bind(refundStatus, refundFee, refundId)
        .run();

      const totals = await db
        .prepare("SELECT SUM(amount) AS total FROM payment_refunds WHERE order_id = ?")
        .bind(existingRefund.order_id)
        .first();
      const totalRefunded = Number(totals?.total || 0);
      const order = await findOrderById(db, existingRefund.order_id);
      if (order) {
        const nextStatus =
          totalRefunded >= Number(order.amount_paid || 0) ? "refunded" : "refund_partial";
        await db
          .prepare(
            "UPDATE orders SET amount_refunded = ?, status = ?, updated_at = ?, service_status = NULL WHERE id = ?"
          )
          .bind(totalRefunded, nextStatus, now, order.id)
          .run();
      }

      await recordEvent("processed", refundId, null);
      if (order) {
        await sendRefundEmailIfNeeded({
          order,
          refundId,
          refundAmount: existingRefund.amount,
          refundStatus,
        });
      }
      return respond(200, { ok: true });
    }

    await recordEvent("ignored", customId, "unhandled_event_type");
    return respond(200, { ok: true, ignored: true });
  }

  return null;
}
