CREATE TABLE member_leads (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT,
  name TEXT,
  contact_info TEXT,
  checkup_date TEXT,
  companions TEXT,
  emergency_contact TEXT,
  source TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX member_leads_email_idx ON member_leads(email);
