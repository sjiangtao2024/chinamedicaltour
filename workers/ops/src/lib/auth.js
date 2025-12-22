export function isValidToken(token, expected) {
  return Boolean(token) && token === expected;
}
