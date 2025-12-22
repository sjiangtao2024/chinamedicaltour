import assert from "node:assert/strict";
import { shouldFallback } from "../src/lib/rag.js";

assert.equal(shouldFallback(false, []), true);
assert.equal(shouldFallback(true, ["A"]), false);
