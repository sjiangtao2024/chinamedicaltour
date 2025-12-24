import { sendVerificationEmail } from "./lib/email.js";
import {
  buildVerificationKey,
  generateVerificationCode,
  normalizeEmail,
} from "./lib/verification.js";
import { jsonResponse } from "./lib/response.js";

async function readJson(request) {
  try {
    return await request.json();
  } catch (error) {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/auth/start-email" && request.method === "POST") {
      const body = await readJson(request);
      const email = normalizeEmail(body?.email);
      if (!email) {
        return jsonResponse(400, { ok: false, error: "email_required" });
      }

      const code = generateVerificationCode();
      const key = buildVerificationKey(email);
      await env.MEMBERS_KV.put(key, code, { expirationTtl: 600 });
      await sendVerificationEmail({
        apiKey: env.RESEND_API_KEY,
        from: env.FROM_EMAIL,
        to: email,
        code,
      });
      return jsonResponse(200, { ok: true });
    }

    if (url.pathname === "/api/auth/verify-email" && request.method === "POST") {
      const body = await readJson(request);
      const email = normalizeEmail(body?.email);
      const code = body?.code ? String(body.code).trim() : "";
      if (!email || !code) {
        return jsonResponse(400, { ok: false, error: "missing_fields" });
      }

      const key = buildVerificationKey(email);
      const stored = await env.MEMBERS_KV.get(key);
      if (!stored) {
        return jsonResponse(400, { ok: false, error: "code_expired" });
      }
      if (stored !== code) {
        return jsonResponse(400, { ok: false, error: "code_invalid" });
      }

      await env.MEMBERS_KV.delete(key);
      return jsonResponse(200, { ok: true, email_verified: true });
    }
    if (url.pathname === "/health") {
      return jsonResponse(200, { ok: true });
    }
    return jsonResponse(404, { error: "not_found" });
  },
};
