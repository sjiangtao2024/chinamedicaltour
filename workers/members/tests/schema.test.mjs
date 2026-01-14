import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync("workers/members/migrations/0001_create_members_tables.sql", "utf8");
assert.ok(sql.includes("CREATE TABLE users"));
assert.ok(sql.includes("CREATE TABLE orders"));

const profileSql = fs.readFileSync(
  "workers/members/migrations/0002_add_user_profiles.sql",
  "utf8"
);
assert.ok(profileSql.includes("CREATE TABLE user_profiles"));

const couponIssuerSql = fs.readFileSync(
  "workers/members/migrations/0005_add_coupon_issuer.sql",
  "utf8"
);
assert.ok(couponIssuerSql.includes("issuer_name"));
assert.ok(couponIssuerSql.includes("issuer_contact"));

const couponSql = fs.readFileSync(
  "workers/members/migrations/0003_add_coupon_max_discount.sql",
  "utf8"
);
assert.ok(couponSql.includes("ALTER TABLE coupons ADD COLUMN max_discount"));

const adminSql = fs.readFileSync(
  "workers/members/migrations/0004_add_admin_users.sql",
  "utf8"
);
assert.ok(adminSql.includes("CREATE TABLE admin_users"));

const refundSql = fs.readFileSync(
  "workers/members/migrations/0006_add_refund_requests.sql",
  "utf8"
);
assert.ok(refundSql.includes("CREATE TABLE refund_requests"));

const orderProfileSql = fs.readFileSync(
  "workers/members/migrations/0008_add_order_profile_name.sql",
  "utf8"
);
assert.ok(orderProfileSql.includes("ALTER TABLE order_profiles"));
assert.ok(orderProfileSql.includes("ADD COLUMN name"));

const refundPolicySql = fs.readFileSync(
  "workers/members/migrations/0010_add_refund_policy_fields.sql",
  "utf8"
);
assert.ok(refundPolicySql.includes("ALTER TABLE orders ADD COLUMN refund_policy_type"));
assert.ok(refundPolicySql.includes("ALTER TABLE orders ADD COLUMN terms_version"));
assert.ok(refundPolicySql.includes("ALTER TABLE orders ADD COLUMN terms_agreed_at"));
assert.ok(refundPolicySql.includes("ALTER TABLE orders ADD COLUMN service_start_date"));
assert.ok(refundPolicySql.includes("ALTER TABLE orders ADD COLUMN delivery_status"));
assert.ok(refundPolicySql.includes("ALTER TABLE orders ADD COLUMN delivered_at"));
assert.ok(refundPolicySql.includes("ALTER TABLE orders ADD COLUMN payment_gateway_fee"));
assert.ok(refundPolicySql.includes("ALTER TABLE orders ADD COLUMN is_deposit"));
assert.ok(refundPolicySql.includes("ALTER TABLE orders ADD COLUMN check_in_date"));
assert.ok(refundPolicySql.includes("ALTER TABLE orders ADD COLUMN amount_refunded"));
assert.ok(refundPolicySql.includes("CREATE TABLE service_products"));
assert.ok(refundPolicySql.includes("CREATE TABLE payment_refunds"));
assert.ok(refundPolicySql.includes("ALTER TABLE service_products ADD COLUMN category"));
assert.ok(refundPolicySql.includes("ALTER TABLE service_products ADD COLUMN price"));
assert.ok(refundPolicySql.includes("ALTER TABLE service_products ADD COLUMN currency"));
assert.ok(refundPolicySql.includes("ALTER TABLE service_products ADD COLUMN features"));
