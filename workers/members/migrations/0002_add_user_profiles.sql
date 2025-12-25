CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY,
  name TEXT,
  gender TEXT,
  birth_date TEXT,
  contact_info TEXT,
  companions TEXT,
  emergency_contact TEXT,
  email TEXT,
  checkup_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
