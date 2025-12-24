import assert from "node:assert/strict";
import { buildVerificationKey } from "../src/lib/verification.js";

assert.equal(buildVerificationKey("test@example.com"), "verify:test@example.com");
