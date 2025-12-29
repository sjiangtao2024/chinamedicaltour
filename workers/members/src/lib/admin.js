export function isAdminAuthorized(authHeader, adminToken) {
  if (!adminToken || !authHeader) {
    return false;
  }
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return false;
  }
  return match[1].trim() === adminToken.trim();
}
