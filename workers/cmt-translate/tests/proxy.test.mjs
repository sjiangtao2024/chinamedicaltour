import assert from "node:assert/strict";

import {
  buildProxyRequest,
  getAllowedOrigin,
  handleOptions,
} from "../src/index.js";

function makeRequest(origin = "https://preview.chinamedicaltour.org") {
  return new Request("https://translate.chinamedicaltour.org/api/status/1", {
    headers: { Origin: origin },
  });
}

async function run() {
  {
    const request = makeRequest();
    const env = { ALLOWED_ORIGINS: "*" };
    assert.equal(getAllowedOrigin(request, env), request.headers.get("Origin"));
  }

  {
    const request = makeRequest("https://other.example");
    const env = { ALLOWED_ORIGINS: "https://preview.chinamedicaltour.org" };
    assert.equal(getAllowedOrigin(request, env), "https://preview.chinamedicaltour.org");
  }

  {
    const request = makeRequest();
    const env = { ALLOWED_ORIGINS: "*" };
    const response = await handleOptions(request, env);
    assert.equal(response.status, 204);
    assert.equal(
      response.headers.get("Access-Control-Allow-Origin"),
      request.headers.get("Origin")
    );
  }

  {
    const request = makeRequest();
    const env = { PROXY_SECRET: "secret" };
    const proxyRequest = buildProxyRequest(
      request,
      new URL("https://example.com/api/status/1"),
      env
    );
    assert.equal(proxyRequest.headers.get("X-Proxy-Secret"), "secret");
  }

  console.log("cmt-translate proxy tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
