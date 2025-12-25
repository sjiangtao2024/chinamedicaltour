import assert from "node:assert/strict";
import { buildLeadPayload } from "../src/lib/smart-cs.js";

const payload = buildLeadPayload({ email: "A@B.COM", name: "Test" });
assert.equal(payload.email, "a@b.com");
