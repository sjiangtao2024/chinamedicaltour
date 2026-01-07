export function getAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS || "*")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (allowed.length === 0 || allowed.includes("*")) {
    return origin || "*";
  }
  if (origin && allowed.includes(origin)) {
    return origin;
  }
  return allowed[0] || "*";
}

export function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", getAllowedOrigin(request, env));
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Proxy-Secret"
  );
  return new Response(response.body, { ...response, headers });
}

export function handleOptions(request, env) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": getAllowedOrigin(request, env),
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Proxy-Secret",
    },
  });
}

export function buildProxyRequest(request, targetUrl, env) {
  const headers = new Headers(request.headers);
  headers.set("X-Proxy-Secret", env.PROXY_SECRET || "");
  headers.delete("Host");
  return new Request(targetUrl.toString(), {
    method: request.method,
    headers,
    body: request.body,
    redirect: "follow",
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return handleOptions(request, env);
    }
    const url = new URL(request.url);
    const targetUrl = new URL(url.pathname + url.search, env.HF_URL);
    const proxyRequest = buildProxyRequest(request, targetUrl, env);
    const response = await fetch(proxyRequest);
    return withCors(response, request, env);
  },
  async scheduled(_event, env) {
    const targetUrl = new URL("/health", env.HF_URL);
    await fetch(targetUrl.toString(), {
      headers: {
        "X-Proxy-Secret": env.PROXY_SECRET || "",
      },
    });
  },
};
