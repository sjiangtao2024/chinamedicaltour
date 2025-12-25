function normalizeString(value) {
  return value && typeof value === "string" ? value.trim() : "";
}

export function buildLeadPayload(input) {
  return {
    user_id: normalizeString(input?.user_id),
    email: normalizeString(input?.email).toLowerCase(),
    name: normalizeString(input?.name),
    contact_info: normalizeString(input?.contact_info),
    checkup_date: normalizeString(input?.checkup_date),
    companions: normalizeString(input?.companions),
    emergency_contact: normalizeString(input?.emergency_contact),
    source: normalizeString(input?.source || "members"),
  };
}

export async function sendLead(env, payload) {
  if (!env.SMART_CS_LEAD_URL || !env.SMART_CS_LEAD_TOKEN) {
    throw new Error("missing_smart_cs_config");
  }
  const response = await fetch(env.SMART_CS_LEAD_URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + env.SMART_CS_LEAD_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error("smart_cs_error:" + response.status + ":" + text);
  }
}
