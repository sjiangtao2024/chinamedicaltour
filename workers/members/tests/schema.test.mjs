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
