import assert from "node:assert/strict";
import { getUiHtml } from "../src/ui.js";

const html = getUiHtml();
assert.match(html, /Admin Token/i);
