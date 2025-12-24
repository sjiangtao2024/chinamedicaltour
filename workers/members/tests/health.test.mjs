import assert from "node:assert/strict";
import { jsonResponse } from "../src/lib/response.js";

assert.deepEqual(
  jsonResponse(200, { ok: true }).headers.get("Content-Type"),
  "application/json"
);
