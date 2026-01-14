import assert from "node:assert/strict";
import { parsePaypalFee } from "../src/lib/paypal.js";

const capture = {
  purchase_units: [
    {
      payments: {
        captures: [
          {
            seller_receivable_breakdown: {
              paypal_fee: { value: "3.59" },
            },
          },
        ],
      },
    },
  ],
};

assert.equal(parsePaypalFee(capture), 359);
assert.equal(parsePaypalFee({}), null);
