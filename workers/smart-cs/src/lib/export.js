function parseDateInput(value, { endOfDay } = {}) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  }
  return new Date(value);
}

export function parseExportParams(url, env) {
  const fallbackDays = Number(env.LOG_RETENTION_DAYS) || 14;
  const now = new Date();
  const defaultStart = new Date(now.getTime() - fallbackDays * 24 * 60 * 60 * 1000);
  const startRaw = url.searchParams.get("start");
  const endRaw = url.searchParams.get("end");
  const start = parseDateInput(startRaw, { endOfDay: false }) || defaultStart;
  const end = parseDateInput(endRaw, { endOfDay: true }) || now;
  const startIso = Number.isNaN(start.getTime()) ? defaultStart.toISOString() : start.toISOString();
  const endIso = Number.isNaN(end.getTime()) ? now.toISOString() : end.toISOString();
  const maxRows = Number(env.EXPORT_MAX_ROWS) || 2000;
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || "1000"), 1), maxRows);
  const offset = Math.max(Number(url.searchParams.get("offset") || "0"), 0);
  return { startIso, endIso, limit, offset };
}
