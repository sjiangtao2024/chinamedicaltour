import assert from "node:assert/strict";
import { normalizeEmail } from "../src/lib/verification.js";

assert.equal(normalizeEmail(" Test@Example.com "), "test@example.com");
