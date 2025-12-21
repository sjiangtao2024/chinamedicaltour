import assert from "node:assert/strict";
import { getSystemPrompt } from "../src/lib/knowledge-base.js";
import { normalizeAndTruncateMessages } from "../src/lib/truncate.js";

const systemPrompt = getSystemPrompt();
const userMessage = { role: "user", content: "Is China safe?" };

const result = normalizeAndTruncateMessages(
  [{ role: "system", content: systemPrompt }, userMessage],
  { requestId: "test" },
);

const hasUser = result.some((msg) => msg.role === "user" && msg.content === userMessage.content);
assert.ok(hasUser, "Expected normalized messages to preserve the latest user message.");
