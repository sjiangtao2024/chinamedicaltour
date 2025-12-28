import assert from "node:assert/strict";
import { getSystemPrompt } from "../src/lib/knowledge-base.js";

const prompt = getSystemPrompt();

assert.match(prompt, /Refuse to answer/i);
assert.match(prompt, /medical diagnosis/i);
assert.match(prompt, /politics/i);
assert.match(prompt, /religion/i);
assert.match(prompt, /coding|programming/i);
assert.match(prompt, /redirect/i);
assert.match(prompt, /exchange rate/i);
assert.match(prompt, /real-time|实时/i);
assert.match(prompt, /knowledge\.md/i);
assert.match(prompt, /RAG/i);
assert.match(prompt, /system prompt is intentionally minimal/i);
assert.match(prompt, /invitation letter|visa application/i);
assert.match(prompt, /do not list invitation letters?/i);
assert.match(prompt, /always include a relevant website link/i);
assert.match(prompt, /emoji/i);
assert.match(prompt, /greeting must include.*emoji/i);
assert.match(prompt, /only add emoji.*gentle/i);
assert.match(prompt, /lead info|lead intake/i);
assert.match(prompt, /do not confirm bookings|consultation is scheduled/i);
