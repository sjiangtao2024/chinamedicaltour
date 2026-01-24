function getBearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

const ALLOWED_ORIGINS = new Set([
  "https://chinamedicaltour.org",
  "https://www.chinamedicaltour.org",
  "https://preview.chinamedicaltour.org",
]);

function getCorsHeaders(origin) {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Expose-Headers": "Content-Disposition, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonResponse(status, payload, origin) {
  const cors = getCorsHeaders(origin);
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(cors || {}),
    },
  });
}

async function verifyMemberSession(token) {
  const base = "https://members.chinamedicaltour.org";
  let response;
  try {
    response = await fetch(`${base}/api/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    return false;
  }

  if (!response.ok) return false;

  let payload;
  try {
    payload = await response.json();
  } catch {
    return false;
  }

  return Boolean(payload?.ok);
}

export async function handleRequest({ request, env, url, respond }) {
  if (url.pathname !== "/api/whitepaper") {
    return new Response("Not Found", { status: 404 });
  }

  const origin = request.headers.get("Origin");
  const cors = getCorsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: cors || {},
    });
  }

  if (request.method !== "GET") {
    return jsonResponse(405, { ok: false, error: "method_not_allowed" }, origin);
  }

  const token = getBearerToken(request);
  if (!token) {
    return jsonResponse(401, { ok: false, error: "unauthorized" }, origin);
  }

  const isAuthorized = await verifyMemberSession(token);
  if (!isAuthorized) {
    return jsonResponse(401, { ok: false, error: "unauthorized" }, origin);
  }

  const year = url.searchParams.get("year");
  if (!year || !/^\d{4}$/.test(year)) {
    return jsonResponse(400, { ok: false, error: "year_required" }, origin);
  }
  const yearNumber = Number(year);
  if (yearNumber < 2000 || yearNumber > 2100) {
    return jsonResponse(400, { ok: false, error: "year_invalid" }, origin);
  }

  if (!env.FILES_BUCKET) {
    return jsonResponse(500, { ok: false, error: "missing_bucket" }, origin);
  }

  const prefix = "whitepaper/";
  const slug = "china-cross-border-healthcare";
  const key = `${prefix}${year}-${slug}.pdf`;
  const object = await env.FILES_BUCKET.get(key);
  if (!object) {
    return jsonResponse(404, { ok: false, error: "not_found" }, origin);
  }

  const contentType = object.httpMetadata?.contentType || "application/pdf";
  const filename = `White Paper ${year} - China Cross-border Healthcare.pdf`;

  return new Response(object.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=0, no-store",
      ...(cors || {}),
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest({ request, env, url: new URL(request.url) });
  },
};
