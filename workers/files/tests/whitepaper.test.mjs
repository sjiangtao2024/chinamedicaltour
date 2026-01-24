import assert from "node:assert/strict";
import { handleRequest } from "../src/index.js";

let lastKey = "";
const makeEnv = (overrides = {}) => ({
  FILES_BUCKET: {
    async get(key) {
      lastKey = key;
      if (key.includes("missing")) return null;
      return {
        body: new TextEncoder().encode("PDFDATA"),
        httpMetadata: { contentType: "application/pdf" },
      };
    },
  },
  WHITE_PAPER_PREFIX: "whitepaper/",
  WHITE_PAPER_SLUG: "china-cross-border-healthcare",
  MEMBERS_API_BASE: "https://members.chinamedicaltour.org",
  ...overrides,
});

const respond = (status, payload) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

await (async () => {
  let fetchCalled = false;
  global.fetch = async () => {
    fetchCalled = true;
    return new Response("{}", { status: 200 });
  };

  const request = new Request("https://files.chinamedicaltour.org/api/whitepaper", {
    method: "GET",
  });

  const response = await handleRequest({
    request,
    env: makeEnv(),
    url: new URL(request.url),
    respond,
  });

  assert.equal(response.status, 401);
  assert.equal(fetchCalled, false);
})();

await (async () => {
  global.fetch = async (input, init) => {
    assert.equal(String(input), "https://members.chinamedicaltour.org/api/profile");
    assert.equal(init?.headers?.Authorization, "Bearer token-123");
    return new Response(JSON.stringify({ ok: true, profile_required: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const request = new Request("https://files.chinamedicaltour.org/api/whitepaper", {
    method: "GET",
    headers: { Authorization: "Bearer token-123" },
  });

  const response = await handleRequest({
    request,
    env: makeEnv(),
    url: new URL(request.url),
    respond,
  });

  assert.equal(response.status, 400);
})();

await (async () => {
  global.fetch = async () =>
    new Response(JSON.stringify({ ok: true, profile_required: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  const request = new Request("https://files.chinamedicaltour.org/api/whitepaper?year=2025", {
    method: "GET",
    headers: { Authorization: "Bearer token-123" },
  });

  const response = await handleRequest({
    request,
    env: makeEnv(),
    url: new URL(request.url),
    respond,
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "application/pdf");
  assert.ok(response.headers.get("Content-Disposition")?.includes("attachment"));
  assert.equal(lastKey, "whitepaper/2025-china-cross-border-healthcare.pdf");
})();

await (async () => {
  global.fetch = async () =>
    new Response(JSON.stringify({ ok: true, profile_required: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  const request = new Request("https://files.chinamedicaltour.org/api/whitepaper?year=2025", {
    method: "GET",
    headers: { Authorization: "Bearer token-123" },
  });

  const response = await handleRequest({
    request,
    env: makeEnv({
      FILES_BUCKET: {
        async get() {
          return null;
        },
      },
    }),
    url: new URL(request.url),
    respond,
  });

  assert.equal(response.status, 404);
})();
