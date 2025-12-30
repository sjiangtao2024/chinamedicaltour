import { verifySessionToken } from "./jwt.js";

export function parseBearerToken(headerValue) {
  if (!headerValue) {
    return "";
  }
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

export async function checkBearerToken(headerValue, secret) {
  const token = parseBearerToken(headerValue);
  if (!token) {
    return { ok: false, error: "missing_token" };
  }
  if (!secret) {
    return { ok: false, error: "missing_secret" };
  }
  try {
    const payload = await verifySessionToken(token, secret);
    const userId = payload?.userId || payload?.user_id || "";
    if (!userId) {
      return { ok: false, error: "missing_user_id" };
    }
    return { ok: true, userId };
  } catch (error) {
    return { ok: false, error: error?.message || "invalid_token" };
  }
}
