export async function findAgreementByOrderTerms(db, { orderId, termsVersion }) {
  if (!db || !orderId || !termsVersion) {
    return null;
  }
  return db
    .prepare(
      "SELECT * FROM agreement_acceptances WHERE order_id = ? AND terms_version = ? LIMIT 1"
    )
    .bind(orderId, termsVersion)
    .first();
}

export async function findLatestAgreementByOrder(db, orderId) {
  if (!db || !orderId) {
    return null;
  }
  return db
    .prepare(
      "SELECT * FROM agreement_acceptances WHERE order_id = ? ORDER BY created_at DESC LIMIT 1"
    )
    .bind(orderId)
    .first();
}

export async function insertAgreement(db, data) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO agreement_acceptances (id, user_id, order_id, terms_version, terms_doc_id, accepted_at, digital_accepted_at, methods_accepted_at, user_agent, ip_address, time_zone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      id,
      data.userId,
      data.orderId,
      data.termsVersion,
      data.termsDocId,
      data.acceptedAt,
      data.digitalAcceptedAt || null,
      data.methodsAcceptedAt || null,
      data.userAgent || null,
      data.ipAddress || null,
      data.timeZone || null,
      now
    )
    .run();
  return {
    id,
    user_id: data.userId,
    order_id: data.orderId,
    terms_version: data.termsVersion,
    terms_doc_id: data.termsDocId,
    accepted_at: data.acceptedAt,
    digital_accepted_at: data.digitalAcceptedAt || null,
    methods_accepted_at: data.methodsAcceptedAt || null,
    user_agent: data.userAgent || null,
    ip_address: data.ipAddress || null,
    time_zone: data.timeZone || null,
    created_at: now,
  };
}
