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
