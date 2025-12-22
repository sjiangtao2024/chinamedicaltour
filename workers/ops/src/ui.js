import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const baseDir = dirname(fileURLToPath(import.meta.url));
const uiPath = join(baseDir, "ui.html");

export function getUiHtml() {
  return readFileSync(uiPath, "utf8");
}
