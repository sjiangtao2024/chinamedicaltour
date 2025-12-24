import fs from "node:fs";

const paths = [
  "public/register.html",
  "public/checkout.html",
  "public/post-payment.html",
  "public/assets/js/members.js",
  "public/assets/css/members.css",
];

const missing = paths.filter((path) => !fs.existsSync(path));
if (missing.length > 0) {
  console.error("Missing files:\n" + missing.join("\n"));
  process.exit(1);
}
