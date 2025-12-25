const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";

function toCurrencyValue(amount) {
  if (Number.isInteger(amount)) {
    return (amount / 100).toFixed(2);
  }
  return Number(amount).toFixed(2);
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

async function getAccessToken({ clientId, secret }) {
  const auth = Buffer.from(clientId + ":" + secret).toString("base64");
  const res = await fetch(SANDBOX_BASE + "/v1/oauth2/token", {
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

export async function createPaypalOrder({ clientId, secret, amount, currency, customId, returnUrl, cancelUrl }) {
  const token = await getAccessToken({ clientId, secret });
  const payload = buildOrderPayload({ amount, currency, customId, returnUrl, cancelUrl });
  const res = await fetch(SANDBOX_BASE + "/v2/checkout/orders", {
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

export async function capturePaypalOrder({ clientId, secret, orderId }) {
  const token = await getAccessToken({ clientId, secret });
  const res = await fetch(SANDBOX_BASE + "/v2/checkout/orders/" + orderId + "/capture", {
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

export async function verifyWebhookSignature({
  clientId,
  secret,
  webhookId,
  headers,
  body,
}) {
  const token = await getAccessToken({ clientId, secret });
  const payload = {
    auth_algo: headers.get("paypal-auth-algo"),
    cert_url: headers.get("paypal-cert-url"),
    transmission_id: headers.get("paypal-transmission-id"),
    transmission_sig: headers.get("paypal-transmission-sig"),
    transmission_time: headers.get("paypal-transmission-time"),
    webhook_id: webhookId,
    webhook_event: body,
  };

  const res = await fetch(SANDBOX_BASE + "/v1/notifications/verify-webhook-signature", {
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