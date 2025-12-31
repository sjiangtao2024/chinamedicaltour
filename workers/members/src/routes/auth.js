import { sendVerificationEmail } from "../lib/email.js";
import {
  buildDailyRateKey,
  buildIpRateKey,
  buildSendRateKey,
  buildVerificationKey,
  generateVerificationCode,
  normalizeEmail,
} from "../lib/verification.js";
import { createSessionToken } from "../lib/jwt.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import {
  createUser,
  findUserByEmail,
  findUserByGoogleSub,
  findPasswordIdentity,
  upsertGoogleIdentity,
  upsertPasswordIdentity,
} from "../lib/users.js";
import { checkBearerToken } from "../lib/auth.js";
import { buildAuthUrl, exchangeCode } from "../lib/google-oauth.js";
import { requireDb, readJson } from "../lib/request.js";
import { requireTurnstileToken, verifyTurnstile } from "../lib/turnstile.js";

const DEFAULT_GOOGLE_REDIRECT = "https://chinamedicaltour.org/api/auth/google/callback";

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

export async function handleAuth({ request, env, url, respond }) {
  if (!url.pathname.startsWith("/api/auth")) {
    return null;
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
    const turnstileResult = await verifyTurnstile(request, env, body?.turnstile_token);
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
      const retry = await verifyTurnstile(request, env, body?.turnstile_token);
      if (!retry.ok) {
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
      const turnstileResult = await verifyTurnstile(request, env, body?.turnstile_token);
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
    const turnstileResult = await verifyTurnstile(request, env, body?.turnstile_token);
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
      const turnstileResult = await verifyTurnstile(request, env, body?.turnstile_token);
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

  return null;
}
