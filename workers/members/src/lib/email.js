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
  refundId,
  refundAmount,
  currency,
  refundedAt,
  supportEmail,
}) {
  const firstName = normalizeRecipientName(recipientName);
  const safeOrderId = orderId ? String(orderId) : "";
  const safeRefundId = refundId ? String(refundId) : "";
  const refundDate = refundedAt ? String(refundedAt).slice(0, 10) : "";
  const amountLabel = formatCurrency(refundAmount, currency);
  const supportLine = supportEmail ? `If you have any questions, reply to this email or contact us at ${supportEmail}.` : "";

  const subject = "Your refund has been completed";
  const text = [
    `Hi ${firstName},`,
    "",
    `We've confirmed your refund for Order ${safeOrderId}. The refund has been completed through PayPal and will be returned to your original payment method.`,
    "",
    "Refund summary:",
    `- Amount: ${amountLabel}`,
    safeRefundId ? `- Refund ID: ${safeRefundId}` : null,
    refundDate ? `- Date: ${refundDate}` : null,
    "",
    "When will it arrive?",
    "Most refunds appear within 3-10 business days, depending on your bank or card issuer.",
    "",
    supportLine,
    "",
    "Thank you,",
    "China Medical Tour Team",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>Hi ${firstName},</p>
    <p>We've confirmed your refund for Order <strong>${safeOrderId}</strong>. The refund has been completed through PayPal and will be returned to your original payment method.</p>
    <p><strong>Refund summary:</strong></p>
    <ul>
      <li>Amount: ${amountLabel}</li>
      ${safeRefundId ? `<li>Refund ID: ${safeRefundId}</li>` : ""}
      ${refundDate ? `<li>Date: ${refundDate}</li>` : ""}
    </ul>
    <p><strong>When will it arrive?</strong><br />Most refunds appear within 3-10 business days, depending on your bank or card issuer.</p>
    ${supportEmail ? `<p>If you have any questions, reply to this email or contact us at ${supportEmail}.</p>` : ""}
    <p>Thank you,<br />China Medical Tour Team</p>
  `.trim();

  return { subject, text, html };
}

export async function sendRefundConfirmationEmail({
  apiKey,
  from,
  to,
  subject,
  text,
  html,
  replyTo,
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
      reply_to: replyTo || undefined,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`resend_error:${res.status}:${body}`);
  }
}
