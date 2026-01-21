import assert from "node:assert/strict";
import { classifyPurchaseIntent } from "../src/lib/intent-score.js";

const high = classifyPurchaseIntent("Can you send me the price and payment options?");
assert.equal(high.level, "high");

const medium = classifyPurchaseIntent("What is the process and what should I prepare?");
assert.equal(medium.level, "medium");

const low = classifyPurchaseIntent("Thanks for the info.");
assert.equal(low.level, "low");
