import assert from "node:assert/strict";
import { requireProfile } from "../src/lib/orders.js";

await assert.rejects(
  () => requireProfile(null, "user-1"),
  /missing_profile/
);
