import assert from "node:assert/strict";
import { normalizeLead } from "../src/lib/member-leads.js";

const lead = normalizeLead({ email: "A@B.COM" });
assert.equal(lead.email, "a@b.com");
