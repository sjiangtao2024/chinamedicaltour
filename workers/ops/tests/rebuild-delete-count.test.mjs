import assert from "node:assert/strict";
import { resolveDeleteCount } from "../src/lib/rebuild.js";

assert.equal(resolveDeleteCount(undefined, 500), 500);
assert.equal(resolveDeleteCount(null, 500), 500);
assert.equal(resolveDeleteCount(21, 500), 500);
assert.equal(resolveDeleteCount(800, 500), 800);
assert.equal(resolveDeleteCount(0, 0), 0);
