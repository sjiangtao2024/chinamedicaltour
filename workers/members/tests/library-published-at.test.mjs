import assert from "node:assert/strict";
import { handleLibrary } from "../src/routes/library.js";

const makeResponder = () => (status, payload) =>
  new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });

const insertCalls = [];
const updateCalls = [];
const db = {
  prepare(sql) {
    return {
      bind(...args) {
        if (/INSERT INTO library_articles/i.test(sql)) {
          insertCalls.push({ sql, args });
          return { run() { return { success: true }; } };
        }
        if (/UPDATE library_articles/i.test(sql)) {
          updateCalls.push({ sql, args });
          return { run() { return { success: true }; } };
        }
        return { run() { return { success: true }; } };
      },
    };
  },
};

const env = { MEMBERS_DB: db, LIBRARY_ADMIN_TOKEN: "secret" };

const createUrl = new URL("https://members.chinamedicaltour.org/api/admin/library/articles");
const createResponse = await handleLibrary({
  request: new Request(createUrl, {
    method: "POST",
    headers: {
      Authorization: "Bearer secret",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug: "auto-date",
      title: "Auto Date",
      content_md: "Body",
      status: "published",
    }),
  }),
  env,
  url: createUrl,
  respond: makeResponder(),
});

assert.equal(createResponse.status, 200);
assert.equal(insertCalls.length, 1);
const publishedAtIndex = 12;
assert.ok(insertCalls[0].args[publishedAtIndex]);

const updateUrl = new URL("https://members.chinamedicaltour.org/api/admin/library/articles/article-1");
const updateResponse = await handleLibrary({
  request: new Request(updateUrl, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer secret",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: "published",
    }),
  }),
  env,
  url: updateUrl,
  respond: makeResponder(),
});

assert.equal(updateResponse.status, 200);
assert.equal(updateCalls.length, 1);
assert.match(updateCalls[0].sql, /published_at = \?/i);
