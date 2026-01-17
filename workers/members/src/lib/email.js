export async function sendVerificationEmail({ apiKey, from, to, code }) {
  if (!apiKey || !from) {
    throw new Error("missing_email_config");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Your verification code",
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`resend_error:${res.status}:${text}`);
  }
}

function formatCurrency(amountCents, currency) {
  const numeric = Number(amountCents);
  if (!Number.isFinite(numeric)) {
    return "";
  }
  const value = numeric / 100;
  const safeCurrency = currency ? String(currency).toUpperCase() : "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: safeCurrency,
    }).format(value);
  } catch (error) {
    return `${value.toFixed(2)} ${safeCurrency}`.trim();
  }
}

function normalizeRecipientName(name) {
  const trimmed = name ? String(name).trim() : "";
  return trimmed || "there";
}

export function buildRefundConfirmationEmail({
  recipientName,
  orderId,
  orderAmount,
  refundAmount,
  feeAmount,
  currency,
  refundStatus,
  productName,
  orderLink,
  termsVersion,
  termsUrl,
  supportEmail,
  paymentChannel,
}) {
  const safeOrderId = orderId ? String(orderId) : "";
  const subjectOrderId = safeOrderId ? safeOrderId.slice(0, 8).toUpperCase() : "";
  const subject = subjectOrderId
    ? `Refund confirmed for order ${subjectOrderId}`
    : "Refund confirmed";
  const greeting = `Hi ${normalizeRecipientName(recipientName)},`;
  const lines = [
    greeting,
    "",
    "Your refund has been processed.",
  ];

  if (productName) {
    lines.push(`Package: ${productName}`);
  }
  if (safeOrderId) {
    lines.push(`Order ID: ${safeOrderId}`);
  }
  if (paymentChannel) {
    lines.push(`Payment method: ${paymentChannel}`);
  }
  if (refundStatus) {
    lines.push(`Refund status: ${refundStatus}`);
  }

  const orderAmountLabel = formatCurrency(orderAmount, currency);
  const refundAmountLabel = formatCurrency(refundAmount, currency);
  const feeAmountLabel = formatCurrency(feeAmount, currency);
  if (orderAmountLabel) {
    lines.push(`Original payment: ${orderAmountLabel}`);
  }
  if (refundAmountLabel) {
    lines.push(`Refund amount: ${refundAmountLabel}`);
  }
  if (feeAmountLabel) {
    lines.push(`Payment processor fee: ${feeAmountLabel}`);
    lines.push("Refunds exclude payment processor fees.");
  }

  if (orderLink) {
    lines.push("", `View your order: ${orderLink}`);
  }

  if (termsVersion) {
    lines.push(`Terms version: ${termsVersion}`);
  }
  if (termsUrl) {
    lines.push(`Terms: ${termsUrl}`);
  }

  if (supportEmail) {
    lines.push("", `Need help? ${supportEmail}`);
  }

  const text = lines.join("\n");

  const htmlLines = [
    `<p>${greeting}</p>`,
    "<p>Your refund has been processed.</p>",
  ];

  if (productName) {
    htmlLines.push(`<p><strong>Package:</strong> ${productName}</p>`);
  }
  if (safeOrderId) {
    htmlLines.push(`<p><strong>Order ID:</strong> ${safeOrderId}</p>`);
  }
  if (paymentChannel) {
    htmlLines.push(`<p><strong>Payment method:</strong> ${paymentChannel}</p>`);
  }
  if (refundStatus) {
    htmlLines.push(`<p><strong>Refund status:</strong> ${refundStatus}</p>`);
  }
  if (orderAmountLabel) {
    htmlLines.push(`<p><strong>Original payment:</strong> ${orderAmountLabel}</p>`);
  }
  if (refundAmountLabel) {
    htmlLines.push(`<p><strong>Refund amount:</strong> ${refundAmountLabel}</p>`);
  }
  if (feeAmountLabel) {
    htmlLines.push(
      `<p><strong>Payment processor fee:</strong> ${feeAmountLabel}<br/>Refunds exclude payment processor fees.</p>`
    );
  }
  if (orderLink) {
    htmlLines.push(`<p><a href="${orderLink}">View your order</a></p>`);
  }
  if (termsVersion) {
    htmlLines.push(`<p><strong>Terms version:</strong> ${termsVersion}</p>`);
  }
  if (termsUrl) {
    htmlLines.push(`<p><a href="${termsUrl}">Terms & Conditions</a></p>`);
  }
  if (supportEmail) {
    htmlLines.push(`<p>Need help? ${supportEmail}</p>`);
  }

  return { subject, text, html: htmlLines.join("") };
}

export async function sendRefundConfirmationEmail({ apiKey, from, to, subject, text, html }) {
  if (!apiKey || !from) {
    throw new Error("missing_email_config");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`resend_error:${res.status}:${body}`);
  }
}
