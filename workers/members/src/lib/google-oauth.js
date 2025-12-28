const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export function buildAuthUrl(clientId, redirectUri, state, scopes) {
  const scopeValue = scopes || "openid email profile";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopeValue,
    state,
    access_type: "online",
    prompt: "consent",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCode({ clientId, clientSecret, redirectUri, code }) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`google_token_error:${res.status}:${text}`);
  }

  const token = await res.json();
  const userinfo = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });

  if (!userinfo.ok) {
    const text = await userinfo.text();
    throw new Error(`google_userinfo_error:${userinfo.status}:${text}`);
  }

  return userinfo.json();
}
