CREATE TABLE agreement_acceptances (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  terms_version TEXT NOT NULL,
  terms_doc_id TEXT NOT NULL,
  accepted_at TEXT NOT NULL,
  digital_accepted_at TEXT,
  methods_accepted_at TEXT,
  user_agent TEXT,
  ip_address TEXT,
  time_zone TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX agreement_acceptances_order_idx ON agreement_acceptances(order_id);
CREATE INDEX agreement_acceptances_user_idx ON agreement_acceptances(user_id);
CREATE UNIQUE INDEX agreement_acceptances_order_terms_idx ON agreement_acceptances(order_id, terms_version);
