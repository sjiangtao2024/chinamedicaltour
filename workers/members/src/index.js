import { sendVerificationEmail } from "./lib/email.js";
import {
  buildVerificationKey,
  buildSendRateKey,
  buildDailyRateKey,
  buildIpRateKey,
  generateVerificationCode,
  normalizeEmail,
} from "./lib/verification.js";
import { createSessionToken } from "./lib/jwt.js";
import { buildAuthUrl, exchangeCode } from "./lib/google-oauth.js";
import { applyCoupon, resolveCoupon } from "./lib/coupons.js";
import {
  findOrderById,
  findOrderByIdempotency,
  insertOrder,
  updateOrderPayment,
  updateOrderStatus,
} from "./lib/orders.js";
import {
  capturePaypalOrder,
  createPaypalOrder,
  verifyWebhookSignature,
} from "./lib/paypal.js";
import {
  insertOrderProfile,
  normalizeProfile,
  updateUserFromProfile,
} from "./lib/profile.js";
import { jsonResponse } from "./lib/response.js";

const DEFAULT_GOOGLE_REDIRECT =
  "https://chinamedicaltour.org/api/auth/google/callback";

async function readJson(request) {
  try {
    return await request.json();
  } catch (error) {
    return null;
  }
}

function base64UrlFromBytes(bytes) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function generateState() {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  return base64UrlFromBytes(buffer);
}

function requireDb(env) {
  if (!env.MEMBERS_DB) {
    throw new Error("missing_db_binding");
  }
  return env.MEMBERS_DB;
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = new Set([
    "https://chinamedicaltour.org",
    "https://members.chinamedicaltour.org",
  ]);
  if (!allowed.has(origin)) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

async function verifyTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET) {
    return { ok: false, status: 500, error: "missing_turnstile_secret" };
  }
  if (!token) {
    return { ok: false, status: 400, error: "turnstile_required" };
  }

  const form = new URLSearchParams();
  form.set("secret", env.TURNSTILE_SECRET);
  form.set("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) {
    form.set("remoteip", ip);
  }

  let response;
  try {
    response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      }
    );
  } catch (error) {
    return { ok: false, status: 502, error: "turnstile_unreachable" };
  }

  if (!response.ok) {
    return { ok: false, status: 502, error: "turnstile_unreachable" };
  }

  const data = await response.json().catch(() => null);
  if (!data?.success) {
    return { ok: false, status: 400, error: "turnstile_failed" };
  }
  return { ok: true };
}

function matchProfilePath(pathname) {
  const match = pathname.match(/^\/api\/orders\/([^/]+)\/profile$/);
  return match ? match[1] : null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const respond = (status, payload) =>
      jsonResponse(status, payload, corsHeaders(request));
    try {
      if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
      }

      if (url.pathname === "/api/auth/start-email" && request.method === "POST") {
        const body = await readJson(request);
        const email = normalizeEmail(body?.email);
        if (!email) {
          return respond(400, { ok: false, error: "email_required" });
        }
        if (!env.MEMBERS_KV) {
          return respond(500, { ok: false, error: "missing_kv" });
        }
        const kv = env.MEMBERS_KV;
        const sendKey = buildSendRateKey(email);
        const recent = await kv.get(sendKey);
        if (recent) {
          return respond(200, { ok: true });
        }
        const dailyKey = buildDailyRateKey(email);
        const dailyCount = Number((await kv.get(dailyKey)) || 0);
        const ip = request.headers.get("CF-Connecting-IP") || "";
        const ipKey = ip ? buildIpRateKey(ip) : "";
        const ipCount = ipKey ? Number((await kv.get(ipKey)) || 0) : 0;
        const emailLimit = 5;
        const ipLimit = 20;
        const needsTurnstile = dailyCount >= emailLimit || ipCount >= ipLimit;
        if (needsTurnstile) {
          const turnstileResult = await verifyTurnstile(
            request,
            env,
            body?.turnstile_token
          );
          if (!turnstileResult.ok) {
            return respond(200, { ok: true });
          }
        }
        if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
          return respond(500, { ok: false, error: "missing_email_config" });
        }

        const code = generateVerificationCode();
        const key = buildVerificationKey(email);
        await kv.put(key, code, { expirationTtl: 600 });
        await kv.put(sendKey, "1", { expirationTtl: 60 });
        await kv.put(dailyKey, String(dailyCount + 1), { expirationTtl: 86400 });
        if (ipKey) {
          await kv.put(ipKey, String(ipCount + 1), { expirationTtl: 86400 });
        }
        await sendVerificationEmail({
          apiKey: env.RESEND_API_KEY,
          from: env.FROM_EMAIL,
          to: email,
          code,
        });
        return respond(200, { ok: true });
      }

      if (url.pathname === "/api/auth/verify-email" && request.method === "POST") {
        const body = await readJson(request);
        const email = normalizeEmail(body?.email);
        const code = body?.code ? String(body.code).trim() : "";
        if (!email || !code) {
          return respond(400, { ok: false, error: "missing_fields" });
        }
        if (body?.turnstile_token) {
          const turnstileResult = await verifyTurnstile(
            request,
            env,
            body?.turnstile_token
          );
          if (!turnstileResult.ok) {
            return respond(turnstileResult.status, {
              ok: false,
              error: turnstileResult.error,
            });
          }
        }

        const key = buildVerificationKey(email);
        const stored = await env.MEMBERS_KV.get(key);
        if (!stored) {
          return respond(400, { ok: false, error: "code_expired" });
        }
        if (stored !== code) {
          return respond(400, { ok: false, error: "code_invalid" });
        }

        await env.MEMBERS_KV.delete(key);
        return respond(200, { ok: true, email_verified: true });
      }

      if (url.pathname === "/api/auth/session" && request.method === "POST") {
        const body = await readJson(request);
        const userId = body?.user_id ? String(body.user_id).trim() : "";
        if (!userId) {
          return respond(400, { ok: false, error: "user_id_required" });
        }
        const secret = env.JWT_SECRET;
        if (!secret) {
          return respond(500, { ok: false, error: "missing_jwt_secret" });
        }
        const token = await createSessionToken({ userId }, secret);
        return respond(200, { ok: true, token });
      }

      if (url.pathname === "/api/auth/google" && request.method === "GET") {
        const state = generateState();
        await env.MEMBERS_KV.put(`oauth_state:${state}`, "1", {
          expirationTtl: 600,
        });
        const redirectUri = env.GOOGLE_REDIRECT_URI || DEFAULT_GOOGLE_REDIRECT;
        const authUrl = buildAuthUrl(env.GOOGLE_CLIENT_ID, redirectUri, state);
        return Response.redirect(authUrl, 302);
      }

      if (url.pathname === "/api/auth/google/callback" && request.method === "GET") {
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (!code || !state) {
          return respond(400, { ok: false, error: "missing_oauth_params" });
        }
        const key = `oauth_state:${state}`;
        const stored = await env.MEMBERS_KV.get(key);
        if (!stored) {
          return respond(400, { ok: false, error: "invalid_state" });
        }
        await env.MEMBERS_KV.delete(key);

        const redirectUri = env.GOOGLE_REDIRECT_URI || DEFAULT_GOOGLE_REDIRECT;
        const profile = await exchangeCode({
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          redirectUri,
          code,
        });

        return jsonResponse(200, {
          ok: true,
          profile: {
            email: profile.email,
            name: profile.name,
            sub: profile.sub,
          },
        }, corsHeaders(request));
      }
if (url.pathname === "/api/orders" && request.method === "POST") {
      const body = await readJson(request);
      const idempotencyKey = body?.idempotency_key
        ? String(body.idempotency_key).trim()
        : "";
      if (!idempotencyKey) {
        return respond(400, { ok: false, error: "idempotency_required" });
      }
      const userId = body?.user_id ? String(body.user_id).trim() : "";
      const itemType = body?.item_type ? String(body.item_type).trim() : "";
      const itemId = body?.item_id ? String(body.item_id).trim() : "";
      const currency = body?.currency ? String(body.currency).trim() : "";
      const amountOriginal = Number(body?.amount_original || 0);
      if (!userId || !itemType || !itemId || !currency || !amountOriginal) {
        return respond(400, { ok: false, error: "missing_fields" });
      }

      let db;
      try {
        db = requireDb(env);
      } catch (error) {
        return respond(500, { ok: false, error: "missing_db" });
      }

      const existing = await findOrderByIdempotency(db, idempotencyKey);
      if (existing) {
        return respond(200, { ok: true, order: existing, reused: true });
      }

      const refChannel = body?.ref_channel ? String(body.ref_channel).trim() : "";
      const couponCode = body?.coupon_code ? String(body.coupon_code).trim() : "";
      const coupon = await resolveCoupon(db, {
        code: couponCode,
        refChannel,
      });
      const amounts = applyCoupon(amountOriginal, coupon);

      const order = await insertOrder(db, {
        userId,
        itemType,
        itemId,
        amountOriginal: amounts.original,
        discountAmount: amounts.discount,
        amountPaid: amounts.paid,
        currency,
        refChannel,
        couponId: coupon?.id || null,
        status: "created",
        idempotencyKey,
      });

      return respond(201, { ok: true, order });
    }

      if (url.pathname === "/api/paypal/create" && request.method === "POST") {
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

      const paypalOrder = await createPaypalOrder({
        clientId: env.PAYPAL_CLIENT_ID,
        secret: env.PAYPAL_SECRET,
        amount: order.amount_paid,
        currency: order.currency,
        customId: order.id,
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
      if (!order || !order.paypal_order_id) {
        return respond(404, { ok: false, error: "paypal_order_missing" });
      }

      const capture = await capturePaypalOrder({
        clientId: env.PAYPAL_CLIENT_ID,
        secret: env.PAYPAL_SECRET,
        orderId: order.paypal_order_id,
      });
      const captureId =
        capture?.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;

      const updated = await updateOrderPayment(db, order.id, {
        paypalOrderId: order.paypal_order_id,
        paypalCaptureId: captureId,
        status: "paid_pending_profile",
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

      if (url.pathname === "/health") {
        return jsonResponse(200, { ok: true }, corsHeaders(request));
      }
      return jsonResponse(404, { error: "not_found" }, corsHeaders(request));
    } catch (error) {
      return respond(500, {
        ok: false,
        error: error?.message || "internal_error",
      });
    }
  },
};
