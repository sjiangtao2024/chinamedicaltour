const encoder = new TextEncoder();

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlEncodeBuffer(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLength);
  return Buffer.from(base64, "base64").toString("utf8");
}
async function signToken(data, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64UrlEncodeBuffer(signature);
}

export async function createSessionToken(payload, secret, ttlSeconds = 86400) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const headerPart = base64UrlEncode(JSON.stringify(header));
  const payloadPart = base64UrlEncode(JSON.stringify(body));
  const data = `${headerPart}.${payloadPart}`;
  const signature = await signToken(data, secret);
  return `${data}.${signature}`;
}
export async function verifySessionToken(token, secret) {
  if (!token || !secret) {
    throw new Error("invalid_token");
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("invalid_token");
  }
  const [headerPart, payloadPart, signaturePart] = parts;
  const data = `${headerPart}.${payloadPart}`;
  const expected = await signToken(data, secret);
  if (expected !== signaturePart) {
    throw new Error("invalid_token");
  }
  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadPart));
  } catch (error) {
    throw new Error("invalid_token");
  }
  const now = Math.floor(Date.now() / 1000);
  if (payload?.exp && now > payload.exp) {
    throw new Error("expired_token");
  }
  return payload;
}
