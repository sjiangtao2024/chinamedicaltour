import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/jwt.js";
import { handleProfile } from "../src/routes/profile.js";

const secret = "secret";
const token = await createSessionToken({ userId: "user-1" }, secret);

const request = new Request("https://members.chinamedicaltour.org/api/profile", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "user@example.com",
  }),
});

const response = await handleProfile({
  request,
  env: { JWT_SECRET: secret },
  url: new URL(request.url),
  respond: (status, payload) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
});

assert.equal(response.status, 400);
const payload = await response.json();
assert.equal(payload.error, "checkup_date_required");
