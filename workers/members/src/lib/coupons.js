export function applyCoupon(amount, coupon) {
  const original = amount;
  if (!coupon) {
    return { original, discount: 0, paid: original };
  }
  if (coupon.type === "percent") {
    const discount = Math.round((original * coupon.value) / 100);
    return { original, discount, paid: Math.max(0, original - discount) };
  }
  if (coupon.type === "fixed") {
    const discount = Math.min(original, coupon.value);
    return { original, discount, paid: original - discount };
  }
  return { original, discount: 0, paid: original };
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

export async function resolveCoupon(db, { code, refChannel }) {
  const byRef = await findCouponByRef(db, refChannel);
  if (byRef) return byRef;
  return findCouponByCode(db, code);
}
