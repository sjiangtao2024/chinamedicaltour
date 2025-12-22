export function buildInsert() {
  return "INSERT INTO chat_logs (request_id, user_text, assistant_text, created_at) VALUES (?, ?, ?, ?)";
}

export function buildCleanup(days) {
  return `DELETE FROM chat_logs WHERE created_at < datetime('now', '-${days} days')`;
}
