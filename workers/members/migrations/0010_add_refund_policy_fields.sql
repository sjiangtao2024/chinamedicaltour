ALTER TABLE orders ADD COLUMN refund_policy_type TEXT;
ALTER TABLE orders ADD COLUMN terms_version TEXT;
ALTER TABLE orders ADD COLUMN terms_agreed_at TEXT;
ALTER TABLE orders ADD COLUMN service_start_date TEXT;
ALTER TABLE orders ADD COLUMN delivery_status TEXT DEFAULT 'PENDING';
ALTER TABLE orders ADD COLUMN delivered_at TEXT;
ALTER TABLE orders ADD COLUMN payment_gateway_fee INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN is_deposit INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN check_in_date TEXT;
ALTER TABLE orders ADD COLUMN amount_refunded INTEGER DEFAULT 0;

CREATE TABLE service_products (
  id TEXT PRIMARY KEY,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  name TEXT,
  refund_policy_type TEXT NOT NULL,
  terms_version TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX service_products_item_idx ON service_products(item_type, item_id);
ALTER TABLE service_products ADD COLUMN category TEXT;
ALTER TABLE service_products ADD COLUMN price INTEGER;
ALTER TABLE service_products ADD COLUMN currency TEXT;
ALTER TABLE service_products ADD COLUMN features TEXT;

CREATE TABLE payment_refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  gateway_fee INTEGER,
  gateway_refund_id TEXT,
  status TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX payment_refunds_order_idx ON payment_refunds(order_id);
CREATE INDEX payment_refunds_status_idx ON payment_refunds(status);

INSERT INTO service_products (id, item_type, item_id, name, refund_policy_type, terms_version, created_at, updated_at) VALUES
  ('svc_pre_consultation', 'package', 'pre-consultation', 'PrimeCare Pre-Consultation', 'INTELLECTUAL', '2026-01-14', datetime('now'), datetime('now')),
  ('svc_full_body', 'package', 'full-body', 'Full Body Scan', 'STANDARD', '2026-01-14', datetime('now'), datetime('now')),
  ('svc_cancer', 'package', 'cancer', 'Cancer Screening', 'STANDARD', '2026-01-14', datetime('now'), datetime('now')),
  ('svc_cardiovascular', 'package', 'cardiovascular', 'Cardiovascular Check', 'STANDARD', '2026-01-14', datetime('now'), datetime('now')),
  ('svc_pain', 'package', 'pain', 'Pain Management Program', 'STANDARD', '2026-01-14', datetime('now'), datetime('now')),
  ('svc_skin', 'package', 'skin', 'TCM Dermatology Program', 'STANDARD', '2026-01-14', datetime('now'), datetime('now')),
  ('svc_reset', 'package', 'reset', 'The Reset Program', 'STANDARD', '2026-01-14', datetime('now'), datetime('now')),
  ('svc_womens', 'package', 'womens', 'Women''s Health Program', 'STANDARD', '2026-01-14', datetime('now'), datetime('now')),
  ('svc_dental', 'package', 'dental', 'Dental Treatment', 'CUSTOM', '2026-01-14', datetime('now'), datetime('now')),
  ('svc_eye', 'package', 'eye', 'Vision Correction', 'CUSTOM', '2026-01-14', datetime('now'), datetime('now')),
  ('svc_aesthetics', 'package', 'aesthetics', 'Medical Aesthetics', 'CUSTOM', '2026-01-14', datetime('now'), datetime('now')),
  ('svc_orthopedics', 'package', 'orthopedics', 'Orthopedic Consultation', 'CUSTOM', '2026-01-14', datetime('now'), datetime('now'));
