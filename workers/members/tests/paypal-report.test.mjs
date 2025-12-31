import assert from "node:assert/strict";
import { buildTransactionSearchParams } from "../src/lib/paypal.js";

const params = buildTransactionSearchParams({
  startDate: "2025-12-01T00:00:00Z",
  endDate: "2025-12-31T23:59:59Z",
});

assert.equal(params.get("start_date"), "2025-12-01T00:00:00Z");
assert.equal(params.get("end_date"), "2025-12-31T23:59:59Z");
assert.equal(params.get("fields"), "transaction_info");
