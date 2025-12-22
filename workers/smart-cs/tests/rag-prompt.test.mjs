import assert from "node:assert/strict";
import { buildRagContext } from "../src/lib/rag.js";

const ctx = buildRagContext(["A", "B"]);
assert.match(ctx, /A/);
assert.match(ctx, /B/);
