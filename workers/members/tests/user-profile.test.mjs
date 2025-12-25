import assert from "node:assert/strict";
import { normalizeProfile } from "../src/lib/profile.js";

const profile = normalizeProfile({ email: "A@B.COM" });
assert.equal(profile.email, "a@b.com");
