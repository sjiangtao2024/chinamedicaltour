import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync("workers/members/migrations/0001_create_members_tables.sql", "utf8");
assert.ok(sql.includes("CREATE TABLE users"));
assert.ok(sql.includes("CREATE TABLE orders"));
