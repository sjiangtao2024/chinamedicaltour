import assert from "node:assert/strict";
import { parseExportParams } from "../src/lib/export.js";

const env = { LOG_RETENTION_DAYS: 14, EXPORT_MAX_ROWS: 2000 };
const url = new URL(
  "https://api.chinamedicaltour.org/admin/export.csv?start=2025-12-01&end=2025-12-23&limit=1000&offset=0",
);

const result = parseExportParams(url, env);

assert.equal(result.startIso, "2025-12-01T00:00:00.000Z");
assert.equal(result.endIso, "2025-12-23T23:59:59.999Z");
