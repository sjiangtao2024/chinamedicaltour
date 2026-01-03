CREATE TABLE webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  resource_id TEXT,
  status TEXT NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL
);
