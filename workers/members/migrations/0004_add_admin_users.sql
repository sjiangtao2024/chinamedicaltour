CREATE TABLE admin_users (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX admin_users_user_idx ON admin_users(user_id);
