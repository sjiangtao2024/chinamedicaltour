import assert from "node:assert/strict";
import { validateContact } from "../src/lib/lead-intake.js";

const okEmail = validateContact("A: name@example.com");
assert.equal(okEmail.ok, true);
assert.equal(okEmail.type, "email");

const okWhatsApp = validateContact("B: +86 199 1038 5444");
assert.equal(okWhatsApp.ok, true);
assert.equal(okWhatsApp.type, "whatsapp");

const badEmail = validateContact("A: nameexample.com");
assert.equal(badEmail.ok, false);

const badWhatsApp = validateContact("B: 1234");
assert.equal(badWhatsApp.ok, false);
