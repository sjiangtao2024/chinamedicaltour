export async function findAdminUser(db, userId) {
  if (!db || !userId) {
    return null;
  }
  return db.prepare("SELECT * FROM admin_users WHERE user_id = ?").bind(userId).first();
}

export async function isAdminUser(db, userId) {
  const admin = await findAdminUser(db, userId);
  return Boolean(admin);
}

export async function listAdminOrders(db, { status, userId, from, to, limit = 50 }) {
  if (!db) {
    return { results: [] };
  }
  const conditions = [];
  const params = [];
  if (status) {
    conditions.push("orders.status = ?");
    params.push(status);
  }
  if (userId) {
    conditions.push("orders.user_id = ?");
    params.push(userId);
  }
  if (from) {
    conditions.push("orders.created_at >= ?");
    params.push(from);
  }
  if (to) {
    conditions.push("orders.created_at <= ?");
    params.push(to);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const query =
    "SELECT orders.id, orders.user_id, orders.item_type, orders.item_id, orders.amount_paid, orders.currency, " +
    "orders.status, orders.service_status, orders.created_at, orders.updated_at, orders.paypal_order_id, orders.paypal_capture_id, " +
    "orders.payment_channel, orders.transaction_id, " +
    "COALESCE(user_profiles.name, users.name) AS user_name, " +
    "COALESCE(user_profiles.email, users.email) AS user_email, " +
    "COALESCE(user_profiles.contact_info, users.preferred_contact) AS contact_info, " +
    "COALESCE(orders.payment_channel, CASE WHEN orders.paypal_capture_id IS NOT NULL OR orders.paypal_order_id IS NOT NULL THEN 'paypal' ELSE NULL END) AS payment_channel, " +
    "COALESCE(orders.transaction_id, orders.paypal_capture_id, orders.paypal_order_id) AS transaction_id " +
    "FROM orders " +
    "LEFT JOIN users ON orders.user_id = users.id " +
    "LEFT JOIN user_profiles ON orders.user_id = user_profiles.user_id " +
    where +
    " ORDER BY orders.created_at DESC LIMIT ?";

  return db.prepare(query).bind(...params, limit).all();
}

export async function findAdminOrderDetails(db, orderId) {
  if (!db || !orderId) {
    return null;
  }
  const query =
    "SELECT orders.*, " +
    "orders.payment_channel, orders.transaction_id, orders.service_status, " +
    "order_profiles.nationality AS nationality, " +
    "order_profiles.travel_date AS travel_date, " +
    "order_profiles.travel_group_size AS travel_group_size, " +
    "COALESCE(user_profiles.name, users.name) AS user_name, " +
    "COALESCE(user_profiles.email, users.email) AS user_email, " +
    "COALESCE(user_profiles.contact_info, users.preferred_contact) AS contact_info, " +
    "COALESCE(orders.payment_channel, CASE WHEN orders.paypal_capture_id IS NOT NULL OR orders.paypal_order_id IS NOT NULL THEN 'paypal' ELSE NULL END) AS payment_channel, " +
    "COALESCE(orders.transaction_id, orders.paypal_capture_id, orders.paypal_order_id) AS transaction_id " +
    "FROM orders " +
    "LEFT JOIN order_profiles ON order_profiles.order_id = orders.id AND order_profiles.created_at = (" +
    "SELECT MAX(created_at) FROM order_profiles WHERE order_id = orders.id" +
    ") " +
    "LEFT JOIN users ON orders.user_id = users.id " +
    "LEFT JOIN user_profiles ON orders.user_id = user_profiles.user_id " +
    "WHERE orders.id = ? LIMIT 1";
  return db.prepare(query).bind(orderId).first();
}

export function reconcilePaypalTransactions(orders, transactions) {
  const orderList = Array.isArray(orders) ? orders : [];
  const transactionList = Array.isArray(transactions) ? transactions : [];
  const ordersByCapture = new Map();
  const ordersByPaypalOrder = new Map();

  for (const order of orderList) {
    if (!order) {
      continue;
    }
    if (order.paypal_capture_id) {
      ordersByCapture.set(order.paypal_capture_id, order);
    }
    if (order.paypal_order_id) {
      ordersByPaypalOrder.set(order.paypal_order_id, order);
    }
  }

  const matched = [];
  const paypalMissingOrder = [];
  const matchedOrderIds = new Set();

  for (const transaction of transactionList) {
    const info = transaction?.transaction_info || {};
    const captureId = info.transaction_id || "";
    const orderId = info.paypal_reference_id || "";
    const matchedOrder =
      (captureId && ordersByCapture.get(captureId)) ||
      (orderId && ordersByPaypalOrder.get(orderId));

    if (matchedOrder) {
      matched.push({ order: matchedOrder, transaction });
      matchedOrderIds.add(matchedOrder.id);
    } else {
      paypalMissingOrder.push(transaction);
    }
  }

  const orderMissingPaypal = orderList.filter((order) => {
    if (!order) {
      return false;
    }
    if (!order.paypal_capture_id && !order.paypal_order_id) {
      return false;
    }
    return !matchedOrderIds.has(order.id);
  });

  return {
    matched,
    paypal_missing_order: paypalMissingOrder,
    order_missing_paypal: orderMissingPaypal,
  };
}
