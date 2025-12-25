import assert from "node:assert/strict";
import {
  buildVerificationKey,
  buildSendRateKey,
  buildDailyRateKey,
  buildIpRateKey,
} from "../src/lib/verification.js";

assert.equal(buildVerificationKey("test@example.com"), "verify:test@example.com");
assert.equal(buildSendRateKey("test@example.com"), "verify:send:test@example.com");
assert.equal(buildDailyRateKey("test@example.com"), "verify:daily:test@example.com");
assert.equal(buildIpRateKey("1.2.3.4"), "verify:ip:1.2.3.4");
