CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  country TEXT,
  preferred_contact TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX users_email_idx ON users(email);

CREATE TABLE auth_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  google_sub TEXT,
  password_hash TEXT,
  email_verified_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX auth_user_idx ON auth_identities(user_id);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  amount_original INTEGER NOT NULL,
  discount_amount INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL,
  currency TEXT NOT NULL,
  ref_channel TEXT,
  coupon_id TEXT,
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  status TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX orders_idempotency_idx ON orders(idempotency_key);

CREATE TABLE order_profiles (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  gender TEXT,
  birth_date TEXT,
  contact_info TEXT,
  companions TEXT,
  emergency_contact TEXT,
  email TEXT,
  checkup_date TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX order_profiles_order_idx ON order_profiles(order_id);

CREATE TABLE coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  type TEXT NOT NULL,
  value INTEGER NOT NULL,
  ref_channel TEXT,
  scope TEXT,
  valid_from TEXT,
  valid_to TEXT,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX coupons_code_idx ON coupons(code);
