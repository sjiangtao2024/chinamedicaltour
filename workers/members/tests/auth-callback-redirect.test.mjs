import assert from "node:assert/strict";
import { buildPortalCallbackUrl } from "../src/lib/auth-callback.js";

const url = buildPortalCallbackUrl(
  { MEMBER_PORTAL_URL: "https://chinamedicaltour.org" },
  "logincode123"
);

assert.equal(
  url,
  "https://chinamedicaltour.org/auth-callback?code=logincode123"
);
