export function buildVerificationKey(email) {
  return `verify:${email}`;
}

export function buildSendRateKey(email) {
  return `verify:send:${email}`;
}

export function buildDailyRateKey(email) {
  return `verify:daily:${email}`;
}

export function buildIpRateKey(ip) {
  return `verify:ip:${ip}`;
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
