import assert from "node:assert/strict";
import { buildCleanup } from "../src/lib/chat-log.js";

const sql = buildCleanup(7);
assert.match(sql, /delete from chat_logs/i);
assert.match(sql, /-7/);
