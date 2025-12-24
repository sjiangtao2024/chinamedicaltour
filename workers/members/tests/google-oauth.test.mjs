import assert from "node:assert/strict";
import { buildAuthUrl } from "../src/lib/google-oauth.js";

const url = buildAuthUrl(
  "client",
  "https://chinamedicaltour.org/api/auth/google/callback",
  "state123"
);
assert.ok(url.includes("accounts.google.com"));
