function normalizeDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function parseSummaryParams(url) {
  const date = normalizeDate(url.searchParams.get("date"));
  const from = normalizeDate(url.searchParams.get("from"));
  const to = normalizeDate(url.searchParams.get("to"));
  const intent = url.searchParams.get("intent") || "";

  let start = from;
  let end = to;
  if (date) {
    start = new Date(date);
    start.setHours(0, 0, 0, 0);
    end = new Date(date);
    end.setHours(23, 59, 59, 999);
  }
  if (!start || !end) {
    const today = new Date();
    const startFallback = new Date(today);
    startFallback.setHours(0, 0, 0, 0);
    const endFallback = new Date(today);
    endFallback.setHours(23, 59, 59, 999);
    start = start || startFallback;
    end = end || endFallback;
  }

  const limitRaw = Number(url.searchParams.get("limit") || 50);
  const offsetRaw = Number(url.searchParams.get("offset") || 0);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    intent: intent?.trim() || null,
    limit,
    offset,
  };
}

export function buildSummaryQueries({ startIso, endIso, intent, limit, offset }) {
  const conditions = ["created_at >= ?", "created_at <= ?"];
  const args = [startIso, endIso];
  if (intent) {
    conditions.push("intent_level = ?");
    args.push(intent);
  }
  const where = `WHERE ${conditions.join(" AND ")}`;

  const statsSql =
    "SELECT " +
    "COUNT(*) AS total_chats, " +
    "COUNT(DISTINCT session_id) AS unique_sessions, " +
    "COUNT(DISTINCT member_id) AS unique_members, " +
    "COUNT(DISTINCT COALESCE(member_id, session_id)) AS unique_customers, " +
    "SUM(CASE WHEN intent_level = 'high' THEN 1 ELSE 0 END) AS intent_high, " +
    "SUM(CASE WHEN intent_level = 'medium' THEN 1 ELSE 0 END) AS intent_medium, " +
    "SUM(CASE WHEN intent_level = 'low' THEN 1 ELSE 0 END) AS intent_low " +
    "FROM chat_logs " +
    where;

  const summariesSql =
    "SELECT request_id, assistant_summary, intent_level, intent_reason, page_url, created_at " +
    "FROM chat_logs " +
    where +
    " AND assistant_summary IS NOT NULL AND TRIM(assistant_summary) <> '' " +
    "ORDER BY created_at DESC LIMIT ? OFFSET ?";

  const summariesArgs = [...args, limit, offset];

  return {
    statsSql,
    statsArgs: args,
    summariesSql,
    summariesArgs,
  };
}
