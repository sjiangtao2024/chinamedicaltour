import assert from "node:assert/strict";
import { buildSummaryQueries } from "../src/lib/admin-summary.js";

const startIso = "2026-01-20T00:00:00.000Z";
const endIso = "2026-01-21T23:59:59.999Z";

const result = buildSummaryQueries({
  startIso,
  endIso,
  intent: "high",
  limit: 20,
  offset: 10,
});

assert.match(result.statsSql, /COUNT\(\*\) AS total_chats/);
assert.match(result.statsSql, /COUNT\(DISTINCT session_id\)/);
assert.match(result.statsSql, /COUNT\(DISTINCT member_id\)/);
assert.match(result.statsSql, /COALESCE\(member_id, session_id\)/);
assert.match(result.statsSql, /intent_level = \\?/);
assert.deepEqual(result.statsArgs, [startIso, endIso, "high"]);

assert.match(result.summariesSql, /assistant_summary/);
assert.match(result.summariesSql, /ORDER BY created_at DESC/);
assert.match(result.summariesSql, /intent_level = \\?/);
assert.deepEqual(result.summariesArgs, [startIso, endIso, "high", 20, 10]);
