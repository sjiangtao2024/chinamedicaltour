function normalizeString(value) {
  return value && typeof value === "string" ? value.trim() : "";
}

export function normalizeProfile(input) {
  return {
    name: normalizeString(input?.name),
    gender: normalizeString(input?.gender),
    birth_date: normalizeString(input?.birth_date),
    contact_info: normalizeString(input?.contact_info),
    companions: normalizeString(input?.companions),
    emergency_contact: normalizeString(input?.emergency_contact),
    email: normalizeString(input?.email).toLowerCase(),
    checkup_date: normalizeString(input?.checkup_date),
  };
}

export function isProfileComplete(profile) {
  return Boolean(profile?.user_id);
}

export async function insertOrderProfile(db, orderId, profile) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      "INSERT INTO order_profiles (id, order_id, gender, birth_date, contact_info, companions, emergency_contact, email, checkup_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      id,
      orderId,
      profile.gender || null,
      profile.birth_date || null,
      profile.contact_info || null,
      profile.companions || null,
      profile.emergency_contact || null,
      profile.email || null,
      profile.checkup_date || null,
      now
    )
    .run();

  return { id, order_id: orderId, created_at: now, ...profile };
}

export async function updateUserFromProfile(db, userId, profile) {
  const now = new Date().toISOString();
  await db
    .prepare(
      "UPDATE users SET name = COALESCE(?, name), preferred_contact = COALESCE(?, preferred_contact), updated_at = ? WHERE id = ?"
    )
    .bind(profile.name || null, profile.contact_info || null, now, userId)
    .run();
}

export async function upsertUserProfile(db, userId, profile) {
  const now = new Date().toISOString();
  const existing = await db
    .prepare("SELECT user_id FROM user_profiles WHERE user_id = ?")
    .bind(userId)
    .first();

  if (existing) {
    await db
      .prepare(
        "UPDATE user_profiles SET name = ?, gender = ?, birth_date = ?, contact_info = ?, companions = ?, emergency_contact = ?, email = ?, checkup_date = ?, updated_at = ? WHERE user_id = ?"
      )
      .bind(
        profile.name || null,
        profile.gender || null,
        profile.birth_date || null,
        profile.contact_info || null,
        profile.companions || null,
        profile.emergency_contact || null,
        profile.email || null,
        profile.checkup_date || null,
        now,
        userId
      )
      .run();
  } else {
    await db
      .prepare(
        "INSERT INTO user_profiles (user_id, name, gender, birth_date, contact_info, companions, emergency_contact, email, checkup_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        userId,
        profile.name || null,
        profile.gender || null,
        profile.birth_date || null,
        profile.contact_info || null,
        profile.companions || null,
        profile.emergency_contact || null,
        profile.email || null,
        profile.checkup_date || null,
        now,
        now
      )
      .run();
  }

  return db
    .prepare("SELECT * FROM user_profiles WHERE user_id = ?")
    .bind(userId)
    .first();
}
