function parseAllowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function isOriginAllowed(origin, env) {
  if (!origin) return false;
  return parseAllowedOrigins(env).includes(origin);
}

export function maybeGetCorsHeaders(origin, env) {
  if (!origin) return null;
  if (!isOriginAllowed(origin, env)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function handlePreflight({ origin, env }) {
  if (!origin) {
    return new Response(null, {
      status: 204,
      headers: { Allow: "POST, OPTIONS", "X-Robots-Tag": "noindex, nofollow, nosnippet" },
    });
  }

  const corsHeaders = maybeGetCorsHeaders(origin, env);
  if (!corsHeaders) {
    return new Response("Forbidden: Origin not allowed", {
      status: 403,
      headers: { "X-Robots-Tag": "noindex, nofollow, nosnippet" },
    });
  }

  return new Response(null, {
    status: 204,
    headers: { ...corsHeaders, "X-Robots-Tag": "noindex, nofollow, nosnippet" },
  });
}
