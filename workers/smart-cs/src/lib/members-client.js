function resolveBase(env) {
  const base = env?.MEMBERS_API_BASE || "https://members.chinamedicaltour.org";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export async function fetchOrderDetail({ env, authHeader, orderId, fetchImpl = fetch }) {
  if (!orderId) return null;
  const base = resolveBase(env);
  const url = `${base}/api/orders/${encodeURIComponent(orderId)}`;
  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    return null;
  }
  if (!payload?.ok || !payload.order) return null;
  return payload.order;
}
