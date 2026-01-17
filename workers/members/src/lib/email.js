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

const serviceStatusLabels = {
  pending_contact: "Pending contact",
  contacted: "Contacted",
  awaiting_customer: "Waiting on you",
  in_service: "In service",
  completed: "Completed",
};

const formatCurrency = (cents, currency) => {
  const amount = Number.isFinite(cents) ? cents / 100 : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatShanghaiTime = (iso) => {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
};

const normalizeRecipientName = (name) => {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    return "there";
  }
  return trimmed.split(/\s+/)[0];
};

export function buildOrderConfirmationEmail({
  recipientName,
  orderId,
  packageName,
  amountPaid,
  currency,
  paidAt,
  serviceStatus,
  orderLink,
  intakeLink,
  supportEmail,
  brandName,
}) {
  const firstName = normalizeRecipientName(recipientName);
  const serviceLabel = serviceStatusLabels[serviceStatus] || serviceStatus || "Not set yet";
  const amountLabel = formatCurrency(amountPaid, currency);
  const paidAtLabel = formatShanghaiTime(paidAt);
  const signature = brandName || "CMT Care Team";
  const subject = "Order confirmed - Next steps for your care";
  const noReply = "Please do not reply to this email.";
  const supportLine = supportEmail ? `Contact us at ${supportEmail}.` : "";

  const text = `Hi ${firstName},

Thank you for your payment. Your order is confirmed.

Order summary
- Order ID: ${orderId}
- Package: ${packageName}
- Amount: ${amountLabel} ${currency || ""}
- Paid at: ${paidAtLabel} (China time)

What happens next
- Our care team will contact you within 24-48 hours via email or WhatsApp.
- If we need any documents, we will let you know.

Your service status
- ${serviceLabel}

Quick links
- View your order: ${orderLink}
- Update intake information: ${intakeLink}

Need help?
${supportLine}

${noReply}

-- ${signature}`;

  const html = `
    <p>Hi ${firstName},</p>
    <p>Thank you for your payment. Your order is confirmed.</p>
    <h3>Order summary</h3>
    <ul>
      <li><strong>Order ID:</strong> ${orderId}</li>
      <li><strong>Package:</strong> ${packageName}</li>
      <li><strong>Amount:</strong> ${amountLabel} ${currency || ""}</li>
      <li><strong>Paid at:</strong> ${paidAtLabel} (China time)</li>
    </ul>
    <h3>What happens next</h3>
    <ul>
      <li>Our care team will contact you within 24-48 hours via email or WhatsApp.</li>
      <li>If we need any documents, we will let you know.</li>
    </ul>
    <h3>Your service status</h3>
    <p>${serviceLabel}</p>
    <h3>Quick links</h3>
    <ul>
      <li><a href="${orderLink}">View your order</a></li>
      <li><a href="${intakeLink}">Update intake information</a></li>
    </ul>
    ${
      supportEmail
        ? `<p>Need help? Contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>`
        : ""
    }
    <p>${noReply}</p>
    <p>-- ${signature}</p>
  `.trim();

  return { subject, text, html };
}

export async function sendOrderConfirmationEmail({
  apiKey,
  from,
  to,
  subject,
  text,
  html,
}) {
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
  const firstName = normalizeRecipientName(recipientName);
  const lines = [`Hi ${firstName},`, "", "Your refund has been processed."];

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
    `<p>Hi ${firstName},</p>`,
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
