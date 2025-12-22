import assert from "node:assert/strict";
import { parseUpload } from "../src/lib/upload.js";

assert.throws(() => parseUpload({}), /invalid_request/);
assert.deepEqual(parseUpload({ content_markdown: "# A" }), {
  content_markdown: "# A",
  note: null,
  version: null,
});
