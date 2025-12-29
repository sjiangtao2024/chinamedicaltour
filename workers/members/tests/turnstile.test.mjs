import assert from "node:assert/strict";
import { requireTurnstileToken } from "../src/lib/turnstile.js";

assert.deepEqual(requireTurnstileToken(""), {
  ok: false,
  status: 400,
  error: "turnstile_required",
});
assert.deepEqual(requireTurnstileToken("token"), { ok: true });
