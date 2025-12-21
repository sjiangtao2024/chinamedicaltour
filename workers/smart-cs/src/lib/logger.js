export function createRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const rnd = Math.random().toString(16).slice(2);
  return `req_${Date.now().toString(16)}_${rnd}`;
}

export function logJson(level, fields) {
  const payload = { level, ts: new Date().toISOString(), ...fields };
  try {
    console.log(JSON.stringify(payload));
  } catch {
    console.log(
      JSON.stringify({
        level: "error",
        ts: new Date().toISOString(),
        error_code: "logger_failed",
      }),
    );
  }
}

