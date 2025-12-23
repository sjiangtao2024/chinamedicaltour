import assert from "node:assert/strict";
import { buildInsert } from "../src/lib/chat-log.js";

const sql = buildInsert();
assert.match(sql, /insert into chat_logs/i);
assert.match(sql, /assistant_summary/i);
assert.match(sql, /page_context/i);
