import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOrderConfirmationEmail,
  sendOrderConfirmationEmail,
  sendRefundConfirmationEmail,
} from "../lib/email.js";

test("buildOrderConfirmationEmail renders required content", () => {
  const email = buildOrderConfirmationEmail({
    recipientName: "Jane Doe",
    orderId: "order-1",
    packageName: "Full Body Scan",
    amountPaid: 80000,
    currency: "USD",
    paidAt: "2026-01-16T00:00:00.000Z",
    serviceStatus: "pending_contact",
    orderLink: "https://chinamedicaltour.org/member-center/orders/order-1",
    intakeLink: "https://chinamedicaltour.org/member-center/orders/order-1#intake",
    supportEmail: "support@example.com",
    brandName: "CMT Care Team",
  });

  assert.ok(email.subject.includes("Order confirmed"));
  assert.ok(email.text.includes("Order ID: order-1"));
  assert.ok(email.text.includes("Pending contact"));
  assert.ok(email.text.includes("Contact us at support@example.com."));
  assert.ok(email.text.includes("Please do not reply"));
  assert.ok(email.html.includes("CMT Care Team"));
});

test("buildOrderConfirmationEmail omits support line when supportEmail missing", () => {
  const email = buildOrderConfirmationEmail({
    recipientName: "Jane Doe",
    orderId: "order-1",
    packageName: "Full Body Scan",
    amountPaid: 80000,
    currency: "USD",
    paidAt: "2026-01-16T00:00:00.000Z",
    serviceStatus: "pending_contact",
    orderLink: "https://chinamedicaltour.org/member-center/orders/order-1",
    intakeLink: "https://chinamedicaltour.org/member-center/orders/order-1#intake",
    supportEmail: "",
    brandName: "CMT Care Team",
  });

  assert.equal(email.text.includes("Contact us at"), false);
  assert.equal(email.html.includes("Contact us at"), false);
});

test("sendOrderConfirmationEmail posts to Resend", async () => {
  let capturedUrl = "";
  let capturedBody = null;
  const originalFetch = global.fetch;
  global.fetch = async (input, init) => {
    capturedUrl = typeof input === "string" ? input : input.url;
    capturedBody = JSON.parse(init.body);
    return new Response("ok", { status: 200 });
  };

  await sendOrderConfirmationEmail({
    apiKey: "resend-key",
    from: "CMT Care Team <orders@chinamedicaltour.org>",
    to: "jane.doe@example.com",
    subject: "Order confirmed",
    text: "Hello",
    html: "<p>Hello</p>",
  });

  assert.equal(capturedUrl, "https://api.resend.com/emails");
  assert.equal(capturedBody.from, "CMT Care Team <orders@chinamedicaltour.org>");
  assert.equal(capturedBody.to, "jane.doe@example.com");
  assert.equal(capturedBody.subject, "Order confirmed");
  assert.equal(capturedBody.text, "Hello");
  assert.equal(capturedBody.html, "<p>Hello</p>");

  global.fetch = originalFetch;
});

test("sendOrderConfirmationEmail includes bcc when provided", async () => {
  let capturedBody = null;
  const originalFetch = global.fetch;
  global.fetch = async (_input, init) => {
    capturedBody = JSON.parse(init.body);
    return new Response("ok", { status: 200 });
  };

  await sendOrderConfirmationEmail({
    apiKey: "resend-key",
    from: "CMT Care Team <orders@chinamedicaltour.org>",
    to: "jane.doe@example.com",
    bcc: "info@chinamedicaltour.org",
    subject: "Order confirmed",
    text: "Hello",
    html: "<p>Hello</p>",
  });

  assert.equal(capturedBody.bcc, "info@chinamedicaltour.org");

  global.fetch = originalFetch;
});

test("sendRefundConfirmationEmail includes bcc when provided", async () => {
  let capturedBody = null;
  const originalFetch = global.fetch;
  global.fetch = async (_input, init) => {
    capturedBody = JSON.parse(init.body);
    return new Response("ok", { status: 200 });
  };

  await sendRefundConfirmationEmail({
    apiKey: "resend-key",
    from: "CMT Care Team <orders@chinamedicaltour.org>",
    to: "jane.doe@example.com",
    bcc: "info@chinamedicaltour.org",
    subject: "Refund completed",
    text: "Hello",
    html: "<p>Hello</p>",
    replyTo: "support@chinamedicaltour.org",
  });

  assert.equal(capturedBody.bcc, "info@chinamedicaltour.org");

  global.fetch = originalFetch;
});
