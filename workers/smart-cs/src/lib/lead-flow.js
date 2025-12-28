export const LEAD_QUESTIONS = {
  purpose:
    "We can connect you with our team after we collect a few details. You can also fill out the form here:\n" +
    "https://chinamedicaltour.org/contact\n\n" +
    "To begin, which option best matches your needs?\n\n" +
    "A) Health screening\n" +
    "B) Specialized care\n" +
    "C) TCM & wellness\n" +
    "D) Other\n" +
    "Please reply with A, B, C, or D.",
  contact:
    "What's the best way to reach you? Please reply with A or B and include your contact:\n" +
    "A) Email - e.g., A: name@example.com\n" +
    "B) WhatsApp - e.g., B: +86 199 1038 5444",
  contact_invalid:
    "Thanks! Please share a valid contact in one line:\n" +
    "A) Email - e.g., A: name@example.com\n" +
    "B) WhatsApp - e.g., B: +86 199 1038 5444",
  city: "Which city do you prefer?\n\nA) Beijing\nB) Chengdu\nPlease reply with A or B.",
  stay_duration:
    "How long do you expect to stay?\n\n" +
    "A) 1-3 days\n" +
    "B) 4-7 days\n" +
    "C) 8-14 days\n" +
    "D) 15+ days\n" +
    "Please reply with A, B, C, or D.",
  language: "Do you need English interpretation?\n\nA) Yes\nB) No\nPlease reply with A or B.",
  budget_range:
    "What is your budget range? (Optional)\n\n" +
    "A) Under $1,000\n" +
    "B) $1,000-$3,000\n" +
    "C) $3,000-$5,000\n" +
    "D) $5,000+\n" +
    "E) Not sure\n" +
    "Please reply with A, B, C, D, or E.",
  feedback: "Any suggestions or comments for us? (Optional)\nYou can reply in one sentence.",
  done:
    "Thanks! We'll share these details with our team and reach out soon.\n" +
    "You can also fill out the form here:\n" +
    "https://chinamedicaltour.org/contact",
};

const LEAD_FLOW_MARKERS = [
  "free consultation",
  "To begin, which option best matches your needs?",
  "Which city do you prefer?",
  "How long do you expect to stay?",
  "Do you need English interpretation?",
  "What is your budget range?",
  "Any suggestions or comments for us?",
  "What's the best way to reach you?",
  "Please share a valid contact",
];

const LEAD_TRIGGER_KEYWORDS = [
  "free consultation",
  "consultation",
  "consult",
  "contact me",
  "connect me",
  "schedule",
  "book",
  "get started",
];

export function nextLeadQuestion({ lead, contactStatus } = {}) {
  const data = lead || {};
  const hasRequired =
    Boolean(data.purpose) &&
    Boolean(data.city) &&
    Boolean(data.stay_duration) &&
    Boolean(data.language);
  const contactProvided = Boolean(data.contact);
  const contactValid = contactProvided && contactStatus ? contactStatus.ok === true : contactProvided;

  if (!data.purpose) return { step: "purpose", text: LEAD_QUESTIONS.purpose };
  if (!data.city) return { step: "city", text: LEAD_QUESTIONS.city };
  if (!data.stay_duration) return { step: "stay_duration", text: LEAD_QUESTIONS.stay_duration };
  if (!data.budget_range && !contactProvided) {
    return { step: "budget_range", text: LEAD_QUESTIONS.budget_range };
  }
  if (!data.language) return { step: "language", text: LEAD_QUESTIONS.language };
  if (!data.feedback && !contactProvided) return { step: "feedback", text: LEAD_QUESTIONS.feedback };
  if (contactProvided && contactStatus && contactStatus.ok === false) {
    return { step: "contact", text: LEAD_QUESTIONS.contact_invalid };
  }
  if (!contactProvided) return { step: "contact", text: LEAD_QUESTIONS.contact };
  if (hasRequired && contactValid) return { step: "done", text: LEAD_QUESTIONS.done };
  return { step: "contact", text: LEAD_QUESTIONS.contact };
}

export function hasLeadPrompt(messages = []) {
  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message && message.role === "assistant");
  if (!lastAssistant || typeof lastAssistant.content !== "string") return false;
  return LEAD_FLOW_MARKERS.some((marker) => lastAssistant.content.includes(marker));
}

export function shouldUseLeadFlow({ lastUserText, messages } = {}) {
  const text = typeof lastUserText === "string" ? lastUserText.toLowerCase() : "";
  if (LEAD_TRIGGER_KEYWORDS.some((keyword) => text.includes(keyword))) return true;
  return hasLeadPrompt(messages);
}
