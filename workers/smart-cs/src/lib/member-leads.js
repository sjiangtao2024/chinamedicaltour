function normalizeString(value) {
  return value && typeof value === "string" ? value.trim() : "";
}

export function normalizeLead(input) {
  return {
    user_id: normalizeString(input?.user_id),
    email: normalizeString(input?.email).toLowerCase(),
    name: normalizeString(input?.name),
    contact_info: normalizeString(input?.contact_info),
    checkup_date: normalizeString(input?.checkup_date),
    companions: normalizeString(input?.companions),
    emergency_contact: normalizeString(input?.emergency_contact),
    source: normalizeString(input?.source),
  };
}

export async function insertLead(db, lead) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      "INSERT INTO member_leads (id, user_id, email, name, contact_info, checkup_date, companions, emergency_contact, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      id,
      lead.user_id || null,
      lead.email || null,
      lead.name || null,
      lead.contact_info || null,
      lead.checkup_date || null,
      lead.companions || null,
      lead.emergency_contact || null,
      lead.source || null,
      now
    )
    .run();

  return { id, created_at: now, ...lead };
}
