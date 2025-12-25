const API_BASE = "https://members.chinamedicaltour.org";

function getStatusEl() {
  return document.getElementById("status");
}

function setStatus(message, isError) {
  const el = getStatusEl();
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? "#b91c1c" : "#0f172a";
}

function getTurnstileToken() {
  const input = document.querySelector('input[name="cf-turnstile-response"]');
  return input?.value?.trim() || "";
}

function resetTurnstile() {
  if (window.turnstile?.reset) {
    window.turnstile.reset();
  }
}

async function postJson(path, payload) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "request_failed");
  }
  return data;
}

function initRegister() {
  const emailInput = document.getElementById("email");
  const codeInput = document.getElementById("code");
  const sendCode = document.getElementById("send-code");
  const verifyCode = document.getElementById("verify-code");
  const googleLogin = document.getElementById("google-login");

  sendCode?.addEventListener("click", async () => {
    setStatus("Sending code...");
    try {
      const token = getTurnstileToken();
      if (!token) {
        setStatus("Please complete the Turnstile check.", true);
        return;
      }
      await postJson("/api/auth/start-email", {
        email: emailInput.value,
        turnstile_token: token,
      });
      setStatus("Code sent. Check your inbox.");
    } catch (error) {
      setStatus(`Failed to send code: ${error.message}`, true);
      resetTurnstile();
    }
  });

  verifyCode?.addEventListener("click", async () => {
    setStatus("Verifying...");
    try {
      const token = getTurnstileToken();
      if (!token) {
        setStatus("Please complete the Turnstile check.", true);
        return;
      }
      await postJson("/api/auth/verify-email", {
        email: emailInput.value,
        code: codeInput.value,
        turnstile_token: token,
      });
      localStorage.setItem("member_email", emailInput.value.trim());
      setStatus("Email verified. Continue to checkout.");
    } catch (error) {
      setStatus(`Verification failed: ${error.message}`, true);
      resetTurnstile();
    }
  });

  googleLogin?.addEventListener("click", () => {
    window.location.href = `${API_BASE}/api/auth/google`;
  });
}

function initCheckout() {
  const packageSelect = document.getElementById("package");
  const couponInput = document.getElementById("coupon");
  const startPayment = document.getElementById("start-payment");

  startPayment?.addEventListener("click", async () => {
    const email = localStorage.getItem("member_email");
    if (!email) {
      setStatus("Please verify your email first.", true);
      return;
    }

    const selected = packageSelect.options[packageSelect.selectedIndex];
    const amountOriginal = Number(selected.dataset.amount || 0);
    const itemId = selected.value;
    const itemType = itemId === "deposit" ? "deposit" : "package";
    const refChannel = new URLSearchParams(window.location.search).get("ref") || "";
    const idempotencyKey = crypto.randomUUID();

    try {
      setStatus("Creating order...");
      const orderResponse = await postJson("/api/orders", {
        user_id: email,
        item_type: itemType,
        item_id: itemId,
        amount_original: amountOriginal,
        currency: "USD",
        ref_channel: refChannel,
        coupon_code: couponInput.value.trim(),
        idempotency_key: idempotencyKey,
      });

      const paypalResponse = await postJson("/api/paypal/create", {
        order_id: orderResponse.order.id,
      });

      const approval = paypalResponse.links?.find((link) => link.rel === "approve");
      if (approval?.href) {
        window.location.href = approval.href;
        return;
      }
      setStatus("Missing PayPal approval link.", true);
    } catch (error) {
      setStatus(`Checkout failed: ${error.message}`, true);
    }
  });
}

function initPostPayment() {
  const submit = document.getElementById("submit-profile");
  const orderId = new URLSearchParams(window.location.search).get("order_id");
  if (!orderId) {
    setStatus("Missing order id.", true);
    return;
  }

  const emailInput = document.getElementById("email");
  emailInput.value = localStorage.getItem("member_email") || "";

  submit?.addEventListener("click", async () => {
    const payload = {
      name: document.getElementById("name").value,
      gender: document.getElementById("gender").value,
      birth_date: document.getElementById("birth-date").value,
      checkup_date: document.getElementById("checkup-date").value,
      contact_info: document.getElementById("contact").value,
      companions: document.getElementById("companions").value,
      emergency_contact: document.getElementById("emergency").value,
      email: document.getElementById("email").value,
    };

    try {
      setStatus("Submitting profile...");
      await postJson(`/api/orders/${orderId}/profile`, payload);
      setStatus("Profile submitted. Our team will follow up.");
    } catch (error) {
      setStatus(`Submission failed: ${error.message}`, true);
    }
  });
}

const page = document.body.dataset.page;
if (page === "register") initRegister();
if (page === "checkout") initCheckout();
if (page === "post-payment") initPostPayment();
