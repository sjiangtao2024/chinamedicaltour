CREATE TABLE refund_requests (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL,
  admin_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX refund_requests_order_idx ON refund_requests(order_id);
CREATE INDEX refund_requests_user_idx ON refund_requests(user_id);
CREATE INDEX refund_requests_status_idx ON refund_requests(status);
