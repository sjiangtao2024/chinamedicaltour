import assert from "node:assert/strict";
import { containsCjk } from "../src/lib/english-guard.js";

assert.equal(containsCjk("Hello"), false);
assert.equal(containsCjk("你好"), true);
assert.equal(containsCjk("Hello 你好"), true);
