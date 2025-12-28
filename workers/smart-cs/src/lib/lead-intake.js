function normalizeString(value) {
  return value && typeof value === "string" ? value.trim() : "";
}

export function parseLeadExtraction(text) {
  const content = normalizeString(text);
  if (!content) return buildEmptyLead();
  const first = content.indexOf("{");
  const last = content.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return buildEmptyLead();
  const jsonText = content.slice(first, last + 1);
  try {
    const data = JSON.parse(jsonText);
    return normalizeLeadExtraction(data);
  } catch {
    return buildEmptyLead();
  }
}

function buildEmptyLead() {
  return normalizeLeadExtraction({});
}

function normalizeLeadExtraction(data) {
  return {
    purpose: normalizeString(data?.purpose),
    city: normalizeString(data?.city),
    stay_duration: normalizeString(data?.stay_duration),
    budget_range: normalizeString(data?.budget_range),
    language: normalizeString(data?.language),
    contact: normalizeString(data?.contact),
    feedback: normalizeString(data?.feedback),
    complete: Boolean(data?.complete),
  };
}

export function isLeadComplete(lead) {
  if (!lead) return false;
  return (
    Boolean(lead.purpose) &&
    Boolean(lead.city) &&
    Boolean(lead.stay_duration) &&
    Boolean(lead.language) &&
    Boolean(lead.contact)
  );
}

export function buildLeadExtractionPrompt(messages, assistantText) {
  const transcript = []
    .concat(messages || [])
    .filter((m) => m && typeof m.content === "string")
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const assistantBlock = assistantText ? `\nASSISTANT_LAST: ${assistantText}` : "";

  return [
    {
      role: "system",
      content:
        "Extract lead intake fields from the conversation. Output only JSON. " +
        "Required fields: purpose, city, stay_duration, language, contact. " +
        "Optional: budget_range, feedback. " +
        "Set complete=true only when all required fields are present.",
    },
    {
      role: "user",
      content: `CONVERSATION:\n${transcript}${assistantBlock}\n\nReturn JSON only.`,
    },
  ];
}

export function formatLeadEmail({ lead, meta, requestId }) {
  return [
    `Request ID: ${requestId || "unknown"}`,
    `Page URL: ${meta?.page_url || "unknown"}`,
    `Page Context: ${meta?.page_context || "unknown"}`,
    "",
    `Purpose: ${lead.purpose || "unknown"}`,
    `City: ${lead.city || "unknown"}`,
    `Stay Duration: ${lead.stay_duration || "unknown"}`,
    `Budget Range: ${lead.budget_range || "not specified"}`,
    `Language: ${lead.language || "unknown"}`,
    `Contact: ${lead.contact || "unknown"}`,
    `Feedback: ${lead.feedback || "none"}`,
  ].join("\n");
}

export function validateContact(raw) {
  const value = normalizeString(raw);
  if (!value) return { ok: false };
  const [prefix, rest] = value.split(":");
  if (!rest) return { ok: false };
  const label = prefix.trim().toUpperCase();
  const contact = rest.trim();
  if (label === "A") {
    const isEmail = /.+@.+\..+/.test(contact);
    return { ok: isEmail, type: "email", contact };
  }
  if (label === "B") {
    const digits = contact.replace(/[^0-9]/g, "");
    const hasPlus = contact.includes("+");
    const isPhone = hasPlus && digits.length >= 8;
    return { ok: isPhone, type: "whatsapp", contact };
  }
  return { ok: false };
}

export async function sendLeadEmail({ env, lead, meta, requestId }) {
  if (!env?.RESEND_API_KEY) return { ok: false, error: "missing_resend_key" };
  const toEmail = env.LEAD_TO_EMAIL || "info@chinamedicaltour.org";
  const fromEmail = env.LEAD_FROM_EMAIL || "no-reply@chinamedicaltour.org";
  const subject = `Smart CS Lead - ${lead.purpose || "New Inquiry"}`;
  const body = formatLeadEmail({ lead, meta, requestId });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: toEmail,
      subject,
      text: body,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `resend_error:${res.status}:${text}` };
  }
  return { ok: true };
}
