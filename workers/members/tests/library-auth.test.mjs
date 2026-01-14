import assert from "node:assert/strict";
import { requireLibraryAdmin } from "../src/lib/request.js";

const makeRequest = (token) =>
  new Request("https://members.chinamedicaltour.org/api/admin/library/articles", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

const missingToken = await requireLibraryAdmin(makeRequest(""), { LIBRARY_ADMIN_TOKEN: "secret" });
assert.equal(missingToken.ok, false);
assert.equal(missingToken.status, 401);

const missingEnv = await requireLibraryAdmin(makeRequest("secret"), {});
assert.equal(missingEnv.ok, false);
assert.equal(missingEnv.status, 500);

const valid = await requireLibraryAdmin(makeRequest("secret"), { LIBRARY_ADMIN_TOKEN: "secret" });
assert.equal(valid.ok, true);
