import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/lib/password.js";

const hash = await hashPassword("s3cr3t");
assert.ok(hash.includes("$"));
const [, iter] = hash.split("$");
assert.ok(Number(iter) <= 100000);
assert.ok(await verifyPassword("s3cr3t", hash));
assert.equal(await verifyPassword("wrong", hash), false);
