import { isValidToken } from "./lib/auth.js";
import { parseUpload } from "./lib/upload.js";
import { writeKnowledge } from "./lib/r2.js";
import { getUiHtml } from "./ui.js";

function getBearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return new Response(getUiHtml(), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/api/auth" && request.method === "POST") {
      const token = getBearerToken(request);
      if (!isValidToken(token, env.ADMIN_TOKEN)) {
        return jsonResponse(401, { ok: false, error: "unauthorized" });
      }
      return jsonResponse(200, { ok: true });
    }

    if (url.pathname === "/api/knowledge" && request.method === "POST") {
      const token = getBearerToken(request);
      if (!isValidToken(token, env.ADMIN_TOKEN)) {
        return jsonResponse(401, { ok: false, error: "unauthorized" });
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse(400, { ok: false, error: "invalid_request" });
      }

      let payload;
      try {
        payload = parseUpload(body);
      } catch {
        return jsonResponse(400, { ok: false, error: "invalid_request" });
      }

      const updatedAt = new Date().toISOString();
      await writeKnowledge({
        bucket: env.R2_BUCKET,
        key: env.KNOWLEDGE_KEY || "knowledge/knowledge.md",
        content: payload.content_markdown,
        metadata: {
          updated_at: updatedAt,
          note: payload.note || "",
          version: payload.version || "",
        },
      });

      return jsonResponse(200, {
        ok: true,
        key: env.KNOWLEDGE_KEY || "knowledge/knowledge.md",
        updated_at: updatedAt,
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};
