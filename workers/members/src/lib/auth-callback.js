export function buildPortalCallbackUrl(env, loginCode) {
  const portalBase = env?.MEMBER_PORTAL_URL || "https://chinamedicaltour.org";
  const url = new URL("/auth-callback", portalBase);
  url.searchParams.set("code", loginCode);
  return url.toString();
}
