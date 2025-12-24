import fs from "node:fs";

const path = "docs/upgrade-2025-payments/deployment.md";
if (!fs.existsSync(path)) {
  console.error(`Missing ${path}`);
  process.exit(1);
}
