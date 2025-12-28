import assert from "node:assert/strict";
import { LEAD_QUESTIONS, nextLeadQuestion, shouldUseLeadFlow } from "../src/lib/lead-flow.js";

const start = nextLeadQuestion({ lead: {} });
assert.equal(start.text, LEAD_QUESTIONS.purpose);

const nextCity = nextLeadQuestion({ lead: { purpose: "Health screening" } });
assert.equal(nextCity.text, LEAD_QUESTIONS.city);

const nextStay = nextLeadQuestion({ lead: { purpose: "Health screening", city: "Beijing" } });
assert.equal(nextStay.text, LEAD_QUESTIONS.stay_duration);

const nextBudget = nextLeadQuestion({
  lead: { purpose: "Health screening", city: "Beijing", stay_duration: "3 days" },
});
assert.equal(nextBudget.text, LEAD_QUESTIONS.budget_range);

const nextLanguage = nextLeadQuestion({
  lead: {
    purpose: "Health screening",
    city: "Beijing",
    stay_duration: "3 days",
    budget_range: "$1,000-$3,000",
  },
});
assert.equal(nextLanguage.text, LEAD_QUESTIONS.language);

const nextFeedback = nextLeadQuestion({
  lead: {
    purpose: "Health screening",
    city: "Beijing",
    stay_duration: "3 days",
    budget_range: "$1,000-$3,000",
    language: "English",
  },
});
assert.equal(nextFeedback.text, LEAD_QUESTIONS.feedback);

const contactStep = nextLeadQuestion({
  lead: {
    purpose: "Health screening",
    city: "Beijing",
    stay_duration: "3 days",
    budget_range: "$1,000-$3,000",
    language: "English",
    feedback: "No suggestions",
  },
});
assert.equal(contactStep.text, LEAD_QUESTIONS.contact);

const invalidContact = nextLeadQuestion({
  lead: {
    purpose: "Health screening",
    city: "Beijing",
    stay_duration: "3 days",
    budget_range: "$1,000-$3,000",
    language: "English",
    feedback: "No suggestions",
    contact: "not-an-email",
  },
  contactStatus: { ok: false },
});
assert.equal(invalidContact.text, LEAD_QUESTIONS.contact_invalid);

const done = nextLeadQuestion({
  lead: {
    purpose: "Health screening",
    city: "Beijing",
    stay_duration: "3 days",
    budget_range: "$1,000-$3,000",
    language: "English",
    feedback: "No suggestions",
    contact: "user@example.com",
  },
  contactStatus: { ok: true },
});
assert.equal(done.text, LEAD_QUESTIONS.done);

assert.equal(
  shouldUseLeadFlow({
    lastUserText: "I would like a free consultation.",
    messages: [],
  }),
  true,
);

assert.equal(
  shouldUseLeadFlow({
    lastUserText: "I need visa guidance.",
    messages: [],
  }),
  false,
);

assert.equal(
  shouldUseLeadFlow({
    lastUserText: "A",
    messages: [{ role: "assistant", content: LEAD_QUESTIONS.city }],
  }),
  true,
);
