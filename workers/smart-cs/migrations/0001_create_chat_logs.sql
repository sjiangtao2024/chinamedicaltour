CREATE TABLE IF NOT EXISTS chat_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  user_text TEXT NOT NULL,
  assistant_text TEXT NOT NULL,
  created_at TEXT NOT NULL
);
