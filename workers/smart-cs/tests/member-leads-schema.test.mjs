import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync(
  "workers/smart-cs/migrations/0003_create_member_leads.sql",
  "utf8"
);
assert.ok(sql.includes("CREATE TABLE member_leads"));
