const ITERATIONS = 120000;
const KEYLEN = 32;

function base64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    key,
    KEYLEN * 8
  );
  return [
    "pbkdf2",
    ITERATIONS,
    base64(salt),
    base64(new Uint8Array(bits)),
  ].join("$");
}

export async function verifyPassword(password, stored) {
  const [label, iterStr, saltB64, hashB64] = stored.split("$");
  if (label !== "pbkdf2") return false;
  const iterations = Number(iterStr);
  const salt = Uint8Array.from(Buffer.from(saltB64, "base64"));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    KEYLEN * 8
  );
  const computed = base64(new Uint8Array(bits));
  return computed === hashB64;
}
