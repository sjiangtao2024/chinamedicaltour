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
  ...overrides,
});

const respond = (status, payload) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const allowedOrigin = "https://chinamedicaltour.org";

await (async () => {
  const request = new Request("https://files.chinamedicaltour.org/api/whitepaper", {
    method: "OPTIONS",
    headers: {
      Origin: allowedOrigin,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization",
    },
  });

  const response = await handleRequest({
    request,
    env: makeEnv(),
    url: new URL(request.url),
    respond,
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), allowedOrigin);
  assert.ok(response.headers.get("Access-Control-Allow-Methods")?.includes("GET"));
  assert.ok(response.headers.get("Access-Control-Allow-Headers")?.toLowerCase().includes("authorization"));
})();

await (async () => {
  let fetchCalled = false;
  global.fetch = async () => {
    fetchCalled = true;
    return new Response("{}", { status: 200 });
  };

  const request = new Request("https://files.chinamedicaltour.org/api/whitepaper", {
    method: "GET",
    headers: {
      Origin: allowedOrigin,
    },
  });

  const response = await handleRequest({
    request,
    env: makeEnv(),
    url: new URL(request.url),
    respond,
  });

  assert.equal(response.status, 401);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), allowedOrigin);
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
