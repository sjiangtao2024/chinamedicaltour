const API_BASE = "https://members.chinamedicaltour.org";
const SESSION_KEY = "member_session_token";

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

function getSessionToken() {
  return sessionStorage.getItem(SESSION_KEY) || "";
}

function setSessionToken(token) {
  if (token) {
    sessionStorage.setItem(SESSION_KEY, token);
  }
}

async function postJson(path, payload, token) {
  const url = API_BASE + path;
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = "Bearer " + token;
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "request_failed");
  }
  return data;
}

async function createSession(userId) {
  const result = await postJson("/api/auth/session", { user_id: userId });
  if (!result?.token) {
    throw new Error("missing_session_token");
  }
  setSessionToken(result.token);
  return result.token;
}

function initRegister() {
  const emailInput = document.getElementById("email");
  const codeInput = document.getElementById("code");
  const nameInput = document.getElementById("name");
  const passwordInput = document.getElementById("password");
  const passwordConfirmInput = document.getElementById("password-confirm");
  const sendCode = document.getElementById("send-code");
  const verifyCode = document.getElementById("verify-code");
  const setPassword = document.getElementById("set-password");
  const googleLogin = document.getElementById("google-login");
  const passwordSection = document.getElementById("password-section");

  sendCode?.addEventListener("click", async () => {
    setStatus("Sending code...");
    try {
      const token = getTurnstileToken();
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
      await postJson("/api/auth/verify-email", {
        email: emailInput.value,
        code: codeInput.value,
        turnstile_token: token,
      });
      sessionStorage.setItem("member_email", emailInput.value.trim());
      if (passwordSection) {
        passwordSection.hidden = false;
      }
      setStatus("Email verified. Set a password to continue.");
    } catch (error) {
      setStatus(`Verification failed: ${error.message}`, true);
      resetTurnstile();
    }
  });

  setPassword?.addEventListener("click", async () => {
    setStatus("Setting password...");
    try {
      const password = passwordInput.value;
      const confirm = passwordConfirmInput?.value || "";
      if (confirm && confirm !== password) {
        setStatus("Passwords do not match.", true);
        return;
      }
      const result = await postJson("/api/auth/set-password", {
        email: emailInput.value,
        name: nameInput?.value || "",
        password,
      });
      const login = await postJson("/api/auth/login", {
        email: emailInput.value,
        password,
      });
      await createSession(login.user_id || result.user_id);
      setStatus("Account ready. Redirecting...");
      window.location.href = "profile.html";
    } catch (error) {
      setStatus(`Password setup failed: ${error.message}`, true);
    }
  });

  googleLogin?.addEventListener("click", () => {
    window.location.href = API_BASE + "/api/auth/google";
  });
}

function initLogin() {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginButton = document.getElementById("login");
  const googleLogin = document.getElementById("google-login");

  loginButton?.addEventListener("click", async () => {
    setStatus("Signing in...");
    try {
      const result = await postJson("/api/auth/login", {
        email: emailInput.value,
        password: passwordInput.value,
      });
      await createSession(result.user_id);
      setStatus("Signed in. Redirecting...");
      window.location.href = "profile.html";
    } catch (error) {
      setStatus(`Login failed: ${error.message}`, true);
    }
  });

  googleLogin?.addEventListener("click", () => {
    window.location.href = API_BASE + "/api/auth/google";
  });
}

function initProfile() {
  const submit = document.getElementById("submit-profile");
  const token = getSessionToken();
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const emailInput = document.getElementById("email");
  const savedEmail = sessionStorage.getItem("member_email") || "";
  if (emailInput && savedEmail) {
    emailInput.value = savedEmail;
  }

  submit?.addEventListener("click", async () => {
    const payload = {
      name: document.getElementById("name")?.value,
      gender: document.getElementById("gender")?.value,
      birth_date: document.getElementById("birth-date")?.value,
      checkup_date: document.getElementById("checkup-date")?.value,
      contact_info: document.getElementById("contact")?.value,
      companions: document.getElementById("companions")?.value,
      emergency_contact: document.getElementById("emergency")?.value,
      email: document.getElementById("email")?.value,
    };

    try {
      setStatus("Submitting profile...");
      await postJson("/api/profile", payload, token);
      setStatus("Profile saved. Redirecting to checkout...");
      window.location.href = "checkout.html";
    } catch (error) {
      setStatus(`Submission failed: ${error.message}`, true);
    }
  });
}

function initCheckout() {
  const packageSelect = document.getElementById("package");
  const couponInput = document.getElementById("coupon");
  const startPayment = document.getElementById("start-payment");
  const token = getSessionToken();
  if (!token) {
    setStatus("Please sign in first.", true);
    return;
  }

  startPayment?.addEventListener("click", async () => {
    const selected = packageSelect.options[packageSelect.selectedIndex];
    const amountOriginal = Number(selected.dataset.amount || 0);
    const itemId = selected.value;
    const itemType = itemId === "deposit" ? "deposit" : "package";
    const refChannel = new URLSearchParams(window.location.search).get("ref") || "";
    const idempotencyKey = crypto.randomUUID();

    try {
      setStatus("Creating order...");
      const orderResponse = await postJson(
        "/api/orders",
        {
          item_type: itemType,
          item_id: itemId,
          amount_original: amountOriginal,
          currency: "USD",
          ref_channel: refChannel,
          coupon_code: couponInput.value.trim(),
          idempotency_key: idempotencyKey,
        },
        token
      );

      const paypalResponse = await postJson(
        "/api/paypal/create",
        { order_id: orderResponse.order.id },
        token
      );

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

const page = document.body.dataset.page;
if (page === "register") initRegister();
if (page === "login") initLogin();
if (page === "checkout") initCheckout();
if (page === "profile" || page === "post-payment") initProfile();