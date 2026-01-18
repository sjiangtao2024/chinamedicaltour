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

function formatCurrency(cents) {
  const value = Number.isFinite(cents) ? cents : 0;
  return (value / 100).toFixed(2);
}

function buildRefundEmail({ name, orderId, refundId, amount, currency, refundedAt, supportEmail }) {
  const displayName = name || "there";
  const amountText = `${currency} ${formatCurrency(amount)}`;
  const dateText = refundedAt ? refundedAt.slice(0, 10) : "";
  const supportText = supportEmail || "support@chinamedicaltour.org";

  const subject = "Your refund has been completed";
  const text = [
    `Hi ${displayName},`,
    "",
    `We've confirmed your refund for Order ${orderId}. The refund has been completed through PayPal and will be returned to your original payment method.`,
    "",
    "Refund summary:",
    `- Amount: ${amountText}`,
    `- Refund ID: ${refundId}`,
    dateText ? `- Date: ${dateText}` : null,
    "",
    "When will it arrive?",
    "Most refunds appear within 3-10 business days, depending on your bank or card issuer.",
    "",
    `If you have any questions, reply to this email or contact us at ${supportText}.`,
    "",
    "Thank you,",
    "China Medical Tour Team",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>Hi ${displayName},</p>
    <p>We've confirmed your refund for Order <strong>${orderId}</strong>. The refund has been completed through PayPal and will be returned to your original payment method.</p>
    <p><strong>Refund summary:</strong></p>
    <ul>
      <li>Amount: ${amountText}</li>
      <li>Refund ID: ${refundId}</li>
      ${dateText ? `<li>Date: ${dateText}</li>` : ""}
    </ul>
    <p><strong>When will it arrive?</strong><br />Most refunds appear within 3-10 business days, depending on your bank or card issuer.</p>
    <p>If you have any questions, reply to this email or contact us at ${supportText}.</p>
    <p>Thank you,<br />China Medical Tour Team</p>
  `;

  return { subject, text, html };
}

export async function sendRefundEmail({
  apiKey,
  from,
  replyTo,
  to,
  name,
  orderId,
  refundId,
  amount,
  currency,
  refundedAt,
  supportEmail,
}) {
  if (!apiKey || !from) {
    throw new Error("missing_email_config");
  }
  if (!to) {
    throw new Error("missing_email_recipient");
  }

  const email = buildRefundEmail({
    name,
    orderId,
    refundId,
    amount,
    currency,
    refundedAt,
    supportEmail,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: email.subject,
      text: email.text,
      html: email.html,
      reply_to: replyTo || undefined,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`resend_error:${res.status}:${text}`);
  }
}
