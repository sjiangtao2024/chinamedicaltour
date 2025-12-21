import assert from "node:assert/strict";
import { resolveMaxTokens } from "../src/lib/token-budget.js";

const envDefault = {};
assert.equal(resolveMaxTokens(envDefault), 1200);

const envCapped = { MAX_TOKENS: "9000" };
assert.equal(resolveMaxTokens(envCapped), 8192);

const envInvalid = { MAX_TOKENS: "not-a-number" };
assert.equal(resolveMaxTokens(envInvalid), 1200);
