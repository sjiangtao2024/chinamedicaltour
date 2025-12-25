export async function findUserByEmail(db, email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
}

export async function createUser(db, data) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO users (id, email, name, country, preferred_contact, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      id,
      data.email,
      data.name || null,
      data.country || null,
      data.preferred_contact || null,
      data.status || "active",
      now,
      now
    )
    .run();

  return {
    id,
    email: data.email,
    name: data.name || null,
    country: data.country || null,
    preferred_contact: data.preferred_contact || null,
    status: data.status || "active",
    created_at: now,
    updated_at: now,
  };
}

export async function upsertPasswordIdentity(db, userId, hash, verifiedAt) {
  const existing = await db
    .prepare("SELECT id FROM auth_identities WHERE user_id = ? AND provider = ?")
    .bind(userId, "password")
    .first();

  if (existing) {
    await db
      .prepare(
        "UPDATE auth_identities SET password_hash = ?, email_verified_at = ? WHERE id = ?"
      )
      .bind(hash, verifiedAt || null, existing.id)
      .run();
    return { id: existing.id, user_id: userId, password_hash: hash };
  }

  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO auth_identities (id, user_id, provider, password_hash, email_verified_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(id, userId, "password", hash, verifiedAt || null, new Date().toISOString())
    .run();
  return { id, user_id: userId, password_hash: hash };
}

export async function findPasswordIdentity(db, userId) {
  return db
    .prepare("SELECT * FROM auth_identities WHERE user_id = ? AND provider = ?")
    .bind(userId, "password")
    .first();
}
export async function findUserByGoogleSub(db, sub) {
  return db
    .prepare("SELECT u.* FROM users u JOIN auth_identities a ON u.id = a.user_id WHERE a.provider = ? AND a.google_sub = ?")
    .bind("google", sub)
    .first();
}

export async function upsertGoogleIdentity(db, userId, sub, verifiedAt) {
  const existing = await db
    .prepare("SELECT id FROM auth_identities WHERE user_id = ? AND provider = ?")
    .bind(userId, "google")
    .first();
  if (existing) {
    await db
      .prepare(
        "UPDATE auth_identities SET google_sub = ?, email_verified_at = ? WHERE id = ?"
      )
      .bind(sub, verifiedAt || null, existing.id)
      .run();
    return { id: existing.id, user_id: userId, google_sub: sub };
  }
  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO auth_identities (id, user_id, provider, google_sub, email_verified_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(id, userId, "google", sub, verifiedAt || null, new Date().toISOString())
    .run();
  return { id, user_id: userId, google_sub: sub };
}
