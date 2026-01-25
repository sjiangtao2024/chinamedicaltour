import { buildLeadPayload, sendLead } from "../lib/smart-cs.js";
import {
  isProfileComplete,
  normalizeProfile,
  updateUserFromProfile,
  upsertUserProfile,
} from "../lib/profile.js";
import { markPaidOrdersProfileCompleted } from "../lib/orders.js";
import { requireAuth, requireDb, readJson } from "../lib/request.js";

export async function handleProfile({ request, env, url, respond }) {
  if (url.pathname !== "/api/profile") {
    return null;
  }

  if (request.method === "POST") {
    const auth = await requireAuth(request, env);
    if (!auth.ok) {
      return respond(auth.status, { ok: false, error: auth.error });
    }
    const body = await readJson(request);
    const profile = normalizeProfile(body || {});
    if (!profile.checkup_date) {
      return respond(400, { ok: false, error: "checkup_date_required" });
    }
    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }
    const saved = await upsertUserProfile(db, auth.userId, profile);
    await updateUserFromProfile(db, auth.userId, profile);
    if (isProfileComplete(saved)) {
      await markPaidOrdersProfileCompleted(db, auth.userId);
    }
    try {
      const lead = buildLeadPayload({ ...profile, user_id: auth.userId });
      await sendLead(env, lead);
    } catch (error) {
      console.log("smart_cs_sync_failed", error?.message || error);
    }
    return respond(200, { ok: true, profile: saved });
  }

  if (request.method === "GET") {
    const auth = await requireAuth(request, env);
    if (!auth.ok) {
      return respond(auth.status, { ok: false, error: auth.error });
    }
    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }
    const profile = await db
      .prepare("SELECT * FROM user_profiles WHERE user_id = ?")
      .bind(auth.userId)
      .first();
    let mergedProfile = profile ? { ...profile } : null;
    if (!mergedProfile || !mergedProfile.email || !mergedProfile.name) {
      const user = await db
        .prepare("SELECT email, name FROM users WHERE id = ?")
        .bind(auth.userId)
        .first();
      if (user) {
        if (!mergedProfile) {
          mergedProfile = { user_id: auth.userId };
        }
        if (!mergedProfile.email && user.email) {
          mergedProfile.email = user.email;
        }
        if (!mergedProfile.name && user.name) {
          mergedProfile.name = user.name;
        }
      }
    }
    return respond(200, {
      ok: true,
      profile: mergedProfile || null,
      profile_required: !isProfileComplete(mergedProfile),
    });
  }

  return null;
}
