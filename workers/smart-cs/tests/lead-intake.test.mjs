import assert from "node:assert/strict";
import { parseLeadExtraction, isLeadComplete } from "../src/lib/lead-intake.js";

const sample = `
{
  "purpose": "Health screening",
  "city": "Beijing",
  "stay_duration": "5 days",
  "budget_range": "Not specified",
  "language": "English",
  "contact": "user@example.com",
  "feedback": "Interested in faster booking",
  "complete": true
}
`;

const lead = parseLeadExtraction(sample);
assert.equal(lead.purpose, "Health screening");
assert.equal(lead.city, "Beijing");
assert.equal(lead.language, "English");
assert.equal(lead.contact, "user@example.com");
assert.equal(lead.complete, true);
assert.equal(isLeadComplete(lead), true);

const incomplete = parseLeadExtraction(`{ "purpose": "TCM", "contact": "" }`);
assert.equal(isLeadComplete(incomplete), false);
