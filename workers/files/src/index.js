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

  if (request.method !== "GET") {
    return jsonResponse(405, { ok: false, error: "method_not_allowed" });
  }

  const token = getBearerToken(request);
  if (!token) {
    return jsonResponse(401, { ok: false, error: "unauthorized" });
  }

  const isAuthorized = await verifyMemberSession(token);
  if (!isAuthorized) {
    return jsonResponse(401, { ok: false, error: "unauthorized" });
  }

  const year = url.searchParams.get("year");
  if (!year || !/^\d{4}$/.test(year)) {
    return jsonResponse(400, { ok: false, error: "year_required" });
  }
  const yearNumber = Number(year);
  if (yearNumber < 2000 || yearNumber > 2100) {
    return jsonResponse(400, { ok: false, error: "year_invalid" });
  }

  if (!env.FILES_BUCKET) {
    return jsonResponse(500, { ok: false, error: "missing_bucket" });
  }

  const prefix = "whitepaper/";
  const slug = "china-cross-border-healthcare";
  const key = `${prefix}${year}-${slug}.pdf`;
  const object = await env.FILES_BUCKET.get(key);
  if (!object) {
    return jsonResponse(404, { ok: false, error: "not_found" });
  }

  const contentType = object.httpMetadata?.contentType || "application/pdf";
  const filename = `White Paper ${year} - China Cross-border Healthcare.pdf`;

  return new Response(object.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest({ request, env, url: new URL(request.url) });
  },
};
