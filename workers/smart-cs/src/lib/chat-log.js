export function buildInsert() {
  return "INSERT INTO chat_logs (request_id, user_text, assistant_text, assistant_summary, rating, page_url, page_context, session_id, member_id, intent_level, intent_reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
}

export function buildUpdateSummary() {
  return "UPDATE chat_logs SET assistant_summary = ? WHERE request_id = ?";
}

export function buildUpdateRating() {
  return "UPDATE chat_logs SET rating = ? WHERE request_id = ?";
}

export function buildCleanup(days) {
  return `DELETE FROM chat_logs WHERE created_at < datetime('now', '-${days} days')`;
}
