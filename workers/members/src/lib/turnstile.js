export function requireTurnstileToken(token) {
  if (!token) {
    return { ok: false, status: 400, error: "turnstile_required" };
  }
  return { ok: true };
}

export async function verifyTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET) {
    return { ok: false, status: 500, error: "missing_turnstile_secret" };
  }
  if (!token) {
    return { ok: false, status: 400, error: "turnstile_required" };
  }

  const form = new URLSearchParams();
  form.set("secret", env.TURNSTILE_SECRET);
  form.set("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) {
    form.set("remoteip", ip);
  }

  let response;
  try {
    response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      }
    );
  } catch {
    return { ok: false, status: 502, error: "turnstile_unreachable" };
  }

  if (!response.ok) {
    return { ok: false, status: 502, error: "turnstile_unreachable" };
  }

  const data = await response.json().catch(() => null);
  if (!data?.success) {
    return { ok: false, status: 400, error: "turnstile_failed" };
  }
  return { ok: true };
}
