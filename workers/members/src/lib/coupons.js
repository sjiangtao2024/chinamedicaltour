export function applyCoupon(amount, coupon) {
  const original = amount;
  if (!coupon) {
    return { original, discount: 0, paid: original };
  }
  if (coupon.type === "percent") {
    const raw = Math.round((original * coupon.value) / 100);
    const cap = Number.isFinite(coupon.max_discount) ? Math.max(0, coupon.max_discount) : null;
    const discount = cap ? Math.min(raw, cap) : raw;
    return { original, discount, paid: Math.max(0, original - discount) };
  }
  if (coupon.type === "fixed") {
    const discount = Math.min(original, coupon.value);
    return { original, discount, paid: original - discount };
  }
  return { original, discount: 0, paid: original };
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function isCouponActive(coupon, now = new Date()) {
  if (!coupon) return false;
  if (!coupon.type || !coupon.value || coupon.value <= 0) return false;
  const startsAt = toDate(coupon.valid_from);
  const endsAt = toDate(coupon.valid_to);
  if (startsAt && now < startsAt) return false;
  if (endsAt && now > endsAt) return false;
  if (coupon.usage_limit != null && coupon.used_count != null) {
    if (Number(coupon.used_count) >= Number(coupon.usage_limit)) return false;
  }
  return true;
}

const parseCouponScope = (scope) => {
  if (!scope) {
    return null;
  }
  if (scope === "all") {
    return null;
  }
  try {
    const parsed = JSON.parse(scope);
    if (!Array.isArray(parsed)) {
      return null;
    }
    return parsed.filter((item) => typeof item === "string");
  } catch {
    return null;
  }
};

export function isCouponApplicable(coupon, { itemType, itemId }) {
  if (!coupon) {
    return false;
  }
  const scopeItems = parseCouponScope(coupon.scope);
  if (!scopeItems || scopeItems.length === 0) {
    return true;
  }
  if (itemType !== "package") {
    return false;
  }
  return scopeItems.includes(itemId);
}

export async function findCouponByCode(db, code) {
  if (!code) return null;
  return db.prepare("SELECT * FROM coupons WHERE code = ?").bind(code).first();
}

export async function findCouponByRef(db, refChannel) {
  if (!refChannel) return null;
  return db
    .prepare("SELECT * FROM coupons WHERE ref_channel = ?")
    .bind(refChannel)
    .first();
}

export async function resolveCoupon(db, { code, refChannel, itemType, itemId }) {
  if (code) {
    const byCode = await findCouponByCode(db, code);
    if (isCouponActive(byCode) && isCouponApplicable(byCode, { itemType, itemId })) return byCode;
  }
  if (refChannel) {
    const byRef = await findCouponByRef(db, refChannel);
    if (isCouponActive(byRef) && isCouponApplicable(byRef, { itemType, itemId })) return byRef;
  }
  return null;
}

export async function incrementCouponUsage(db, couponId) {
  if (!couponId) return null;
  await db
    .prepare("UPDATE coupons SET used_count = used_count + 1 WHERE id = ?")
    .bind(couponId)
    .run();
  return db.prepare("SELECT * FROM coupons WHERE id = ?").bind(couponId).first();
}
