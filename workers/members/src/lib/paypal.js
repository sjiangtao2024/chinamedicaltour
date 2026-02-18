const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";
const LIVE_BASE = "https://api-m.paypal.com";

export function resolvePaypalBase(paypalEnv) {
  return String(paypalEnv || "").toLowerCase() === "live" ? LIVE_BASE : SANDBOX_BASE;
}

function toCurrencyValue(amount) {
  if (Number.isInteger(amount)) {
    return (amount / 100).toFixed(2);
  }
  return Number(amount).toFixed(2);
}

function toCents(value) {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) {
    return null;
  }
  return Math.round(amount * 100);
}

export function parsePaypalFee(payload) {
  const feeValue =
    payload?.seller_receivable_breakdown?.paypal_fee?.value ||
    payload?.purchase_units?.[0]?.payments?.captures?.[0]?.seller_receivable_breakdown?.paypal_fee
      ?.value ||
    payload?.resource?.seller_receivable_breakdown?.paypal_fee?.value ||
    null;

  if (!feeValue) {
    return null;
  }
  return toCents(feeValue);
}

export function buildOrderPayload({ amount, currency, customId, returnUrl, cancelUrl }) {
  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value: toCurrencyValue(amount),
        },
        custom_id: customId,
      },
    ],
  };
  if (returnUrl || cancelUrl) {
    payload.application_context = {
      return_url: returnUrl,
      cancel_url: cancelUrl,
    };
  }
  return payload;
}

export function buildRefundPayload({ amount, currency, noteToPayer, invoiceId }) {
  const payload = {};
  if (amount != null) {
    payload.amount = {
      currency_code: currency,
      value: toCurrencyValue(amount),
    };
  }
  if (noteToPayer) {
    payload.note_to_payer = noteToPayer;
  }
  if (invoiceId) {
    payload.invoice_id = invoiceId;
  }
  return payload;
}

export function buildTransactionSearchParams({ startDate, endDate }) {
  const params = new URLSearchParams();
  if (startDate) {
    params.set("start_date", startDate);
  }
  if (endDate) {
    params.set("end_date", endDate);
  }
  params.set("fields", "transaction_info");
  params.set("page_size", "100");
  return params;
}

async function getAccessToken({ clientId, secret, paypalEnv }) {
  const base = resolvePaypalBase(paypalEnv);
  const auth = Buffer.from(clientId + ":" + secret).toString("base64");
  const res = await fetch(base + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + auth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error("paypal_token_error:" + res.status + ":" + text);
  }

  const data = await res.json();
  return data.access_token;
}

export async function createPaypalOrder({
  clientId,
  secret,
  amount,
  currency,
  customId,
  returnUrl,
  cancelUrl,
  paypalEnv,
}) {
  const base = resolvePaypalBase(paypalEnv);
  const token = await getAccessToken({ clientId, secret, paypalEnv });
  const payload = buildOrderPayload({ amount, currency, customId, returnUrl, cancelUrl });
  const res = await fetch(base + "/v2/checkout/orders", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error("paypal_create_error:" + res.status + ":" + text);
  }

  return res.json();
}

export async function capturePaypalOrder({ clientId, secret, orderId, paypalEnv }) {
  const base = resolvePaypalBase(paypalEnv);
  const token = await getAccessToken({ clientId, secret, paypalEnv });
  const res = await fetch(base + "/v2/checkout/orders/" + orderId + "/capture", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error("paypal_capture_error:" + res.status + ":" + text);
  }

  return res.json();
}

export async function listPaypalTransactions({ clientId, secret, startDate, endDate, paypalEnv }) {
  const base = resolvePaypalBase(paypalEnv);
  const token = await getAccessToken({ clientId, secret, paypalEnv });
  const params = buildTransactionSearchParams({ startDate, endDate });
  const res = await fetch(base + "/v1/reporting/transactions?" + params.toString(), {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error("paypal_report_error:" + res.status + ":" + text);
  }

  return res.json();
}

export async function refundPaypalCapture({
  clientId,
  secret,
  captureId,
  amount,
  currency,
  noteToPayer,
  invoiceId,
  paypalEnv,
}) {
  const base = resolvePaypalBase(paypalEnv);
  const token = await getAccessToken({ clientId, secret, paypalEnv });
  const payload = buildRefundPayload({ amount, currency, noteToPayer, invoiceId });
  const res = await fetch(base + "/v2/payments/captures/" + captureId + "/refund", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error("paypal_refund_error:" + res.status + ":" + text);
  }

  return res.json();
}

export async function verifyWebhookSignature({
  clientId,
  secret,
  webhookId,
  headers,
  body,
  paypalEnv,
}) {
  const base = resolvePaypalBase(paypalEnv);
  const token = await getAccessToken({ clientId, secret, paypalEnv });
  const payload = {
    auth_algo: headers.get("paypal-auth-algo"),
    cert_url: headers.get("paypal-cert-url"),
    transmission_id: headers.get("paypal-transmission-id"),
    transmission_sig: headers.get("paypal-transmission-sig"),
    transmission_time: headers.get("paypal-transmission-time"),
    webhook_id: webhookId,
    webhook_event: body,
  };

  const res = await fetch(base + "/v1/notifications/verify-webhook-signature", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error("paypal_webhook_error:" + res.status + ":" + text);
  }

  const result = await res.json();
  return result.verification_status === "SUCCESS";
}
