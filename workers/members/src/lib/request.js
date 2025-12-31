import { parseBearerToken } from "./auth.js";
import { findAdminUser } from "./admin.js";
import { verifySessionToken } from "./jwt.js";
import { jsonResponse } from "./response.js";

export async function readJson(request) {
  try {
    return await request.json();
  } catch (error) {
    return null;
  }
}

export function requireDb(env) {
  if (!env.MEMBERS_DB) {
    throw new Error("missing_db_binding");
  }
  return env.MEMBERS_DB;
}

export async function requireAuth(request, env) {
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

export async function requireAdmin(request, env) {
  const auth = await requireAuth(request, env);
  if (!auth.ok) {
    return auth;
  }
  let db;
  try {
    db = requireDb(env);
  } catch (error) {
    return { ok: false, status: 500, error: "missing_db" };
  }
  const admin = await findAdminUser(db, auth.userId);
  if (!admin) {
    return { ok: false, status: 403, error: "forbidden" };
  }
  return { ok: true, userId: auth.userId, admin };
}

export function parseAllowedOrigins(env) {
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
    "https://admin.chinamedicaltour.org",
    "https://members.chinamedicaltour.org",
  ]);
}

export function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = parseAllowedOrigins(env);
  if (!allowed.has(origin)) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function buildRespond(request, env) {
  return (status, payload) => jsonResponse(status, payload, corsHeaders(request, env));
}
