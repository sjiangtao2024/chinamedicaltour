import assert from "node:assert/strict";
import { classifySupportIntent } from "../src/lib/guardrails.js";

assert.equal(classifySupportIntent("I need a refund for my order"), "order");
assert.equal(classifySupportIntent("Order ID: order-123"), "order");
assert.equal(classifySupportIntent("What is your refund policy?"), "policy");
assert.equal(classifySupportIntent("Tell me about Beijing"), null);
