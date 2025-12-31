import { sendVerificationEmail } from "./lib/email.js";
import {
  buildVerificationKey,
  buildSendRateKey,
  buildDailyRateKey,
  buildIpRateKey,
  generateVerificationCode,
  normalizeEmail,
} from "./lib/verification.js";
import { createSessionToken, verifySessionToken } from "./lib/jwt.js";
import { hashPassword, verifyPassword } from "./lib/password.js";
import {
  createUser,
  findUserByEmail,
  findUserByGoogleSub,
  findPasswordIdentity,
  upsertGoogleIdentity,
  upsertPasswordIdentity,
} from "./lib/users.js";
import { checkBearerToken, parseBearerToken } from "./lib/auth.js";
import { buildAuthUrl, exchangeCode } from "./lib/google-oauth.js";
import { applyCoupon, incrementCouponUsage, resolveCoupon } from "./lib/coupons.js";
import {
  findOrderById,
  findOrderByIdempotency,
  findOrderByUser,
  insertOrder,
  listOrdersByUser,
  markPaidOrdersProfileCompleted,
  normalizeOrderInput,
  requireProfile,
  toOrderSummary,
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
  isProfileComplete,
  normalizeProfile,
  updateUserFromProfile,
  upsertUserProfile,
} from "./lib/profile.js";
import { jsonResponse } from "./lib/response.js";
import { buildLeadPayload, sendLead } from "./lib/smart-cs.js";
import { isAdminAuthorized } from "./lib/admin.js";
import { requireTurnstileToken, verifyTurnstile } from "./lib/turnstile.js";
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


function generateLoginCode() {
  const buffer = new Uint8Array(20);
  crypto.getRandomValues(buffer);
  return base64UrlFromBytes(buffer);
}
function requireDb(env) {
  if (!env.MEMBERS_DB) {
    throw new Error("missing_db_binding");
  }
  return env.MEMBERS_DB;
}

async function requireAuth(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = parseBearerToken(authHeader);
  if (!token) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  if (!env.JWT_SECRET) {
    return { ok: false, status: 500, error: "missing_jwt_secret" };
  }
  try {
    const payload = await verifySessionToken(token, env.JWT_SECRET);
    const userId = payload?.userId || payload?.user_id;
    if (!userId) {
      return { ok: false, status: 401, error: "unauthorized" };
    }
    return { ok: true, userId };
  } catch (error) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
}
function requireAdmin(request, env) {
  const adminToken = env?.ADMIN_TOKEN;
  if (!adminToken) {
    return { ok: false, status: 500, error: "missing_admin_token" };
  }
  const authHeader = request.headers.get("Authorization") || "";
  if (!isAdminAuthorized(authHeader, adminToken)) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  return { ok: true };
}
function parseAllowedOrigins(env) {
  const raw = env?.ALLOWED_ORIGINS || "";
  const origins = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (origins.length > 0) {
    return new Set(origins);
  }
  return new Set([
    "https://chinamedicaltour.org",
    "https://members.chinamedicaltour.org",
  ]);
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = parseAllowedOrigins(env);
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

function matchProfilePath(pathname) {
  const match = pathname.match(/^\/api\/orders\/([^/]+)\/profile$/);
  return match ? match[1] : null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const respond = (status, payload) =>
      jsonResponse(status, payload, corsHeaders(request, env));
    try {
      if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
        return new Response(null, { status: 204, headers: corsHeaders(request, env) });
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
        const tokenCheck = requireTurnstileToken(body?.turnstile_token);
        if (!tokenCheck.ok) {
          return respond(tokenCheck.status, { ok: false, error: tokenCheck.error });
        }
        const turnstileResult = await verifyTurnstile(
          request,
          env,
          body?.turnstile_token
        );
        if (!turnstileResult.ok) {
          return respond(turnstileResult.status, { ok: false, error: turnstileResult.error });
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
        const fromEmail = env.VERIFY_FROM_EMAIL || env.FROM_EMAIL;
        if (!env.RESEND_API_KEY || !fromEmail) {
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
          from: fromEmail,
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
        await env.MEMBERS_KV.put(`verified:${email}`, "1", {
          expirationTtl: 900,
        });
        return respond(200, { ok: true, email_verified: true });
      }

      if (url.pathname === "/api/auth/set-password" && request.method === "POST") {
        const body = await readJson(request);
        const email = normalizeEmail(body?.email);
        const password = body?.password ? String(body.password) : "";
        if (!email || !password) {
          return respond(400, { ok: false, error: "missing_fields" });
        }
        if (!env.MEMBERS_KV) {
          return respond(500, { ok: false, error: "missing_kv" });
        }
        const verifiedKey = `verified:${email}`;
        const verified = await env.MEMBERS_KV.get(verifiedKey);
        if (!verified) {
          return respond(400, { ok: false, error: "email_not_verified" });
        }
        let db;
        try {
          db = requireDb(env);
        } catch (error) {
          return respond(500, { ok: false, error: "missing_db" });
        }
        let user = await findUserByEmail(db, email);
        if (!user) {
          user = await createUser(db, { email, name: body?.name });
        }
        const hash = await hashPassword(password);
        await upsertPasswordIdentity(db, user.id, hash, new Date().toISOString());
        await env.MEMBERS_KV.delete(verifiedKey);
        return respond(200, { ok: true, user_id: user.id });
      }

      if (url.pathname === "/api/auth/login" && request.method === "POST") {
        const body = await readJson(request);
        const email = normalizeEmail(body?.email);
        const password = body?.password ? String(body.password) : "";
        if (!email || !password) {
          return respond(400, { ok: false, error: "missing_fields" });
        }
        const tokenCheck = requireTurnstileToken(body?.turnstile_token);
        if (!tokenCheck.ok) {
          return respond(tokenCheck.status, { ok: false, error: tokenCheck.error });
        }
        const turnstileResult = await verifyTurnstile(
          request,
          env,
          body?.turnstile_token
        );
        if (!turnstileResult.ok) {
          return respond(turnstileResult.status, { ok: false, error: turnstileResult.error });
        }
        let db;
        try {
          db = requireDb(env);
        } catch (error) {
          return respond(500, { ok: false, error: "missing_db" });
        }
        const user = await findUserByEmail(db, email);
        if (!user) {
          return respond(401, { ok: false, error: "invalid_credentials" });
        }
        const identity = await findPasswordIdentity(db, user.id);
        if (!identity?.password_hash) {
          return respond(401, { ok: false, error: "invalid_credentials" });
        }
        const ok = await verifyPassword(password, identity.password_hash);
        if (!ok) {
          return respond(401, { ok: false, error: "invalid_credentials" });
        }
        return respond(200, { ok: true, user_id: user.id });
      }

      if (url.pathname === "/api/auth/reset-start" && request.method === "POST") {
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
        const fromEmail = env.VERIFY_FROM_EMAIL || env.FROM_EMAIL;
        if (!env.RESEND_API_KEY || !fromEmail) {
          return respond(500, { ok: false, error: "missing_email_config" });
        }
        const code = generateVerificationCode();
        const key = `reset:${email}`;
        await kv.put(key, code, { expirationTtl: 600 });
        await kv.put(sendKey, "1", { expirationTtl: 60 });
        await kv.put(dailyKey, String(dailyCount + 1), { expirationTtl: 86400 });
        if (ipKey) {
          await kv.put(ipKey, String(ipCount + 1), { expirationTtl: 86400 });
        }
        await sendVerificationEmail({
          apiKey: env.RESEND_API_KEY,
          from: fromEmail,
          to: email,
          code,
        });
        return respond(200, { ok: true });
      }

      if (url.pathname === "/api/auth/reset-password" && request.method === "POST") {
        const body = await readJson(request);
        const email = normalizeEmail(body?.email);
        const code = body?.code ? String(body.code).trim() : "";
        const password = body?.password ? String(body.password) : "";
        if (!email || !code || !password) {
          return respond(400, { ok: false, error: "missing_fields" });
        }
        if (!env.MEMBERS_KV) {
          return respond(500, { ok: false, error: "missing_kv" });
        }
        const key = `reset:${email}`;
        const stored = await env.MEMBERS_KV.get(key);
        if (!stored) {
          return respond(400, { ok: false, error: "code_expired" });
        }
        if (stored !== code) {
          return respond(400, { ok: false, error: "code_invalid" });
        }
        let db;
        try {
          db = requireDb(env);
        } catch (error) {
          return respond(500, { ok: false, error: "missing_db" });
        }
        const user = await findUserByEmail(db, email);
        if (!user) {
          return respond(400, { ok: false, error: "user_not_found" });
        }
        const hash = await hashPassword(password);
        await upsertPasswordIdentity(db, user.id, hash, new Date().toISOString());
        await env.MEMBERS_KV.delete(key);
        return respond(200, { ok: true });
      }
            if (url.pathname === "/api/auth/exchange" && request.method === "POST") {
        const body = await readJson(request);
        const code = body?.code ? String(body.code).trim() : "";
        if (!code) {
          return respond(400, { ok: false, error: "code_required" });
        }
        if (!env.MEMBERS_KV) {
          return respond(500, { ok: false, error: "missing_kv" });
        }
        const key = `oauth_login:${code}`;
        const userId = await env.MEMBERS_KV.get(key);
        if (!userId) {
          return respond(400, { ok: false, error: "code_expired" });
        }
        await env.MEMBERS_KV.delete(key);
        if (!env.JWT_SECRET) {
          return respond(500, { ok: false, error: "missing_jwt_secret" });
        }
        const token = await createSessionToken({ userId }, env.JWT_SECRET);
        return respond(200, { ok: true, token });
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

      if (url.pathname === "/api/auth/debug-token" && request.method === "GET") {
        const authHeader = request.headers.get("Authorization") || "";
        const result = await checkBearerToken(authHeader, env.JWT_SECRET);
        if (!result.ok && result.error === "missing_secret") {
          return respond(500, { ok: false, error: "missing_jwt_secret" });
        }
        if (!result.ok) {
          return respond(401, { ok: false, error: result.error });
        }
        return respond(200, { ok: true, user_id: result.userId });
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
        if (!env.MEMBERS_KV) {
          return respond(500, { ok: false, error: "missing_kv" });
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

        let db;
        try {
          db = requireDb(env);
        } catch (error) {
          return respond(500, { ok: false, error: "missing_db" });
        }
        const email = normalizeEmail(profile?.email);
        let user = await findUserByGoogleSub(db, profile?.sub);
        if (!user && email) {
          user = await findUserByEmail(db, email);
        }
        if (!user) {
          user = await createUser(db, { email, name: profile?.name });
        }
        await upsertGoogleIdentity(db, user.id, profile?.sub || null, new Date().toISOString());
        const loginCode = generateLoginCode();
        await env.MEMBERS_KV.put(`oauth_login:${loginCode}`, user.id, {
          expirationTtl: 300,
        });
        const callbackUrl = new URL("/auth-callback.html", url.origin);
        callbackUrl.searchParams.set("code", loginCode);
        return Response.redirect(callbackUrl.toString(), 302);
      }
      if (url.pathname === "/api/profile" && request.method === "POST") {
        const auth = await requireAuth(request, env);
        if (!auth.ok) {
          return respond(auth.status, { ok: false, error: auth.error });
        }
        const body = await readJson(request);
        const profile = normalizeProfile(body || {});
        let db;
        try {
          db = requireDb(env);
        } catch (error) {
          return respond(500, { ok: false, error: "missing_db" });
        }
        const saved = await upsertUserProfile(db, auth.userId, profile);
        await updateUserFromProfile(db, auth.userId, profile);
        if (isProfileComplete(saved)) {
          await markPaidOrdersProfileCompleted(db, auth.userId);
        }
        try {
          const lead = buildLeadPayload({ ...profile, user_id: auth.userId });
          await sendLead(env, lead);
        } catch (error) {
          console.log("smart_cs_sync_failed", error?.message || error);
        }
        return respond(200, { ok: true, profile: saved });
      }
      if (url.pathname === "/api/profile" && request.method === "GET") {
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
        const profile = await db
          .prepare("SELECT * FROM user_profiles WHERE user_id = ?")
          .bind(auth.userId)
          .first();
        return respond(200, {
          ok: true,
          profile: profile || null,
          profile_required: !isProfileComplete(profile),
        });
      }
      if (url.pathname === "/api/admin/coupons" && request.method === "POST") {
        const admin = requireAdmin(request, env);
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
        const captureId =
          capture?.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;

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
        return jsonResponse(200, { ok: true }, corsHeaders(request, env));
      }
      return jsonResponse(404, { error: "not_found" }, corsHeaders(request, env));
    } catch (error) {
      return respond(500, {
        ok: false,
        error: error?.message || "internal_error",
      });
    }
  },
};
