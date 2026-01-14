import assert from "node:assert/strict";
import { handleLibrary } from "../src/routes/library.js";

function makeResponder() {
  return (status, payload) =>
    new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}

const listCalls = [];
const db = {
  prepare(sql) {
    return {
      bind(...args) {
        listCalls.push({ sql, args });
        return {
          all() {
            return { results: [{ id: "article-1" }] };
          },
        };
      },
    };
  },
};

const listUrl = new URL("https://members.chinamedicaltour.org/api/library/articles?locale=en");
const listResponse = await handleLibrary({
  request: new Request(listUrl, { method: "GET" }),
  env: { MEMBERS_DB: db },
  url: listUrl,
  respond: makeResponder(),
});

assert.equal(listResponse.status, 200);
const listJson = await listResponse.json();
assert.equal(listJson.ok, true);
assert.equal(listJson.items.length, 1);

const adminUrl = new URL("https://members.chinamedicaltour.org/api/admin/library/articles");
const adminResponse = await handleLibrary({
  request: new Request(adminUrl, { method: "GET" }),
  env: { MEMBERS_DB: db, LIBRARY_ADMIN_TOKEN: "secret" },
  url: adminUrl,
  respond: makeResponder(),
});

assert.equal(adminResponse.status, 401);
