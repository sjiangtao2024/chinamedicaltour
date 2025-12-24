export function buildVerificationKey(email) {
  return `verify:${email}`;
}

export function generateVerificationCode() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const code = array[0] % 1000000;
  return String(code).padStart(6, "0");
}

export function normalizeEmail(value) {
  return value && typeof value === "string" ? value.trim().toLowerCase() : "";
}
