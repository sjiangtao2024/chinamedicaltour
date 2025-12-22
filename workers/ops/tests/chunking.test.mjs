import assert from "node:assert/strict";
import { chunkText } from "../src/lib/chunking.js";

const chunks = chunkText("A\n\nB\n\nC", { maxChars: 4 });
assert.deepEqual(chunks, ["A", "B", "C"]);
