(function () {
  function getConfig() {
    var script = document.currentScript;
    if (!script) {
      var scripts = document.getElementsByTagName("script");
      script = scripts[scripts.length - 1];
    }
    var apiUrl = (script && script.getAttribute("data-api-url")) || "https://api.chinamedicaltour.org/api/chat";
    var retry = Number((script && script.getAttribute("data-retry")) || "3");
    return { apiUrl: apiUrl, retry: Number.isFinite(retry) ? retry : 3 };
  }

  var config = getConfig();

  var state = {
    isOpen: false,
    phase: "idle",
    lastPayload: null,
    chatMessages: [],
    abortCtrl: null,
    firstByteTimer: null,
    streamGapTimer: null,
  };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (typeof c === "string") node.appendChild(document.createTextNode(c));
      else if (c) node.appendChild(c);
    });
    return node;
  }

  function scrollToBottom(messagesEl) {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setStatus(statusEl, text) {
    statusEl.textContent = text;
  }

  function setError(errorEl, message, onRetry) {
    if (!message) {
      errorEl.classList.remove("is-visible");
      return;
    }
    errorEl.classList.add("is-visible");
    errorEl.querySelector("[data-role=error-text]").textContent = message;
    var btn = errorEl.querySelector("[data-role=retry]");
    btn.onclick = onRetry || null;
  }

  function createUI() {
    var root = el("div", { class: "cmt-chat" });

    // Use the new Sunny avatar
    var chatIcon = el("img", {
      src: "assets/images/ai_avatar_sunny.png",
      alt: "Sunny - AI Assistant",
      class: "cmt-chat__toggle-img"
    });

    var toggle = el("button", {
      class: "cmt-chat__toggle",
      type: "button",
      "aria-label": "Open chat",
      title: "Chat with Sunny",
    }, [ chatIcon ]);

    var panel = el("div", { class: "cmt-chat__panel", "aria-hidden": "true", role: "dialog", "aria-label": "Chat Assistant" });

    var header = el("div", { class: "cmt-chat__header" });
    header.appendChild(el("div", { class: "cmt-chat__title", text: "Sunny - Your Guide 🌸" }));
    var closeBtn = el("button", {
      class: "cmt-chat__close",
      type: "button",
      "aria-label": "Close chat",
      title: "Close",
    }, [ "×" ]);
    header.appendChild(closeBtn);

    var messages = el("div", { class: "cmt-chat__messages", role: "log", "aria-label": "Messages" });
    var status = el("div", { class: "cmt-chat__status", text: "Idle" });
    var error = el("div", { class: "cmt-chat__error" }, [
      el("div", { "data-role": "error-text", text: "" }),
      el("button", { class: "cmt-chat__error-btn", type: "button", "data-role": "retry", "aria-label": "Retry" }, [
        "Retry",
      ]),
    ]);

    var composer = el("div", { class: "cmt-chat__composer" });
    var input = el("textarea", {
      class: "cmt-chat__input",
      rows: "2",
      placeholder: "Ask about visas, checkups, payment...",
      "aria-label": "Message input",
    });
    var send = el("button", { class: "cmt-chat__send", type: "button", "aria-label": "Send" }, [ "Send" ]);
    composer.appendChild(input);
    composer.appendChild(send);

    panel.appendChild(header);
    panel.appendChild(messages);
    panel.appendChild(status);
    panel.appendChild(error);
    panel.appendChild(composer);

    root.appendChild(toggle);
    root.appendChild(panel);

    document.body.appendChild(root);

    return { root: root, toggle: toggle, panel: panel, closeBtn: closeBtn, messages: messages, status: status, error: error, input: input, send: send };
  }

  function renderMessage(messagesEl, role, text) {
    var wrap = el("div", { class: "cmt-chat__msg cmt-chat__msg--" + role });
    
    // Add Avatar for Assistant
    if (role === "assistant") {
      var avatar = el("img", {
        src: "assets/images/ai_avatar_sunny.png",
        class: "cmt-chat__avatar",
        alt: "Sunny"
      });
      wrap.appendChild(avatar);
    }

    var bubble = el("div", { class: "cmt-chat__bubble" });
    if (role === "assistant" && window.marked) {
      bubble.innerHTML = window.marked.parse(text || "");
    } else {
      bubble.textContent = text || "";
    }
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    scrollToBottom(messagesEl);
    return bubble;
  }

  function clearTimers() {
    if (state.firstByteTimer) clearTimeout(state.firstByteTimer);
    if (state.streamGapTimer) clearTimeout(state.streamGapTimer);
    state.firstByteTimer = null;
    state.streamGapTimer = null;
  }

  function abortActive() {
    if (state.abortCtrl) {
      try {
        state.abortCtrl.abort();
      } catch (e) {}
    }
    state.abortCtrl = null;
    clearTimers();
  }

  function parseSseLines(chunk, onDataLine) {
    var lines = chunk.split("\n");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trimEnd();
      if (!line) continue;
      if (line.startsWith("data:")) onDataLine(line.slice(5).trim());
    }
  }

  async function streamChat(ui, payload, assistantBubble, opts) {
    opts = opts || {};
    abortActive();
    state.abortCtrl = new AbortController();
    state.phase = "connecting";
    setError(ui.error, "", null);
    ui.send.disabled = true;

    setStatus(ui.status, "Connecting…");

    var receivedFirstByte = false;
    state.firstByteTimer = setTimeout(function () {
      if (receivedFirstByte) return;
      state.abortCtrl.abort();
    }, 5000);

    var streamGapReset = function () {
      if (state.streamGapTimer) clearTimeout(state.streamGapTimer);
      state.streamGapTimer = setTimeout(function () {
        state.abortCtrl.abort();
      }, 10000);
    };

    var response;
    try {
      response = await fetch(config.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: state.abortCtrl.signal,
      });
    } catch (e) {
      ui.send.disabled = false;
      state.phase = "error";
      setStatus(ui.status, "Error");
      setError(ui.error, "Connection failed, please try again.", function () {
        streamChat(ui, payload, assistantBubble, opts);
      });
      return;
    }

    if (!response.ok) {
      ui.send.disabled = false;
      state.phase = "error";
      setStatus(ui.status, "Error");
      var msg = "Service unavailable, please try again.";
      try {
        var errJson = await response.json();
        msg = errJson && errJson.message ? errJson.message : msg;
      } catch (e) {}
      setError(ui.error, msg, function () {
        streamChat(ui, payload, assistantBubble, opts);
      });
      return;
    }

    state.phase = "awaiting_first_byte";
    setStatus(ui.status, "Awaiting First Byte…");

    var reader = response.body.getReader();
    var decoder = new TextDecoder("utf-8");
    var buffer = "";
    var assistantText = "";

    try {
      while (true) {
        var r = await reader.read();
        if (r.done) break;
        receivedFirstByte = true;
        clearTimeout(state.firstByteTimer);

        if (state.phase !== "streaming") {
          state.phase = "streaming";
          setStatus(ui.status, "Streaming…");
        }

        streamGapReset();

        buffer += decoder.decode(r.value, { stream: true });
        var parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (var i = 0; i < parts.length; i++) {
          parseSseLines(parts[i], function (data) {
            if (data === "[DONE]") return;
            try {
              var obj = JSON.parse(data);
              var delta = obj && obj.choices && obj.choices[0] && obj.choices[0].delta;
              var content = delta && typeof delta.content === "string" ? delta.content : "";
              if (content) {
                assistantText += content;
                if (window.marked) {
                  assistantBubble.innerHTML = window.marked.parse(assistantText);
                } else {
                  assistantBubble.textContent = assistantText;
                }
                scrollToBottom(ui.messages);
              }
            } catch (e) {}
          });
        }
      }

      ui.send.disabled = false;
      state.phase = "done";
      setStatus(ui.status, "Done");
      setError(ui.error, "", null);
      return assistantText;
    } catch (e) {
      ui.send.disabled = false;
      clearTimers();

      if (!receivedFirstByte && !opts._retriedOnce) {
        setStatus(ui.status, "Awaiting First Byte… retrying");
        assistantBubble.textContent = "";
        return streamChat(ui, payload, assistantBubble, { _retriedOnce: true });
      }

      state.phase = "error";
      setStatus(ui.status, "Error");
      setError(ui.error, "Connection timeout, check network.", function () {
        assistantBubble.textContent = "";
        streamChat(ui, payload, assistantBubble, opts);
      });
      return null;
    } finally {
      clearTimers();
    }
  }

  var ui = createUI();

  function getPageContext() {
    var path = window.location.pathname;
    if (path.includes("how-to-pay")) return { type: "payment", title: "Payment Guide", topic: "Alipay, WeChat Pay, and payment setup" };
    if (path.includes("packages")) return { type: "packages", title: "Medical Packages", topic: "medical checkup packages (Basic, Elite, VIP) and pricing" };
    if (path.includes("visa")) return { type: "visa", title: "Visa Policy", topic: "144-hour transit visa and entry requirements" };
    if (path.includes("culture") || path.includes("stories")) return { type: "culture", title: "Culture & Stories", topic: "travel itineraries, patient stories, and sightseeing in Beijing/Chengdu" };
    if (path.includes("why-choose")) return { type: "trust", title: "Why Choose Us", topic: "hospital quality, safety, and cost advantages" };
    return { type: "home", title: "Home", topic: "general medical tourism inquiries" };
  }

  function getWelcomeMessage(context) {
    var base = "**Hello! I'm Sunny (小晴), your personal China Medical Tour guide.** 🌸\n\n";
    if (context.type === "payment") return base + "I noticed you're looking at payment options. Need help setting up **Alipay** or **WeChat Pay**? I can guide you through the verification process step-by-step! 💳";
    if (context.type === "packages") return base + "Looking for the right health checkup? I can help you compare our **Elite** and **VIP** packages to find the best fit for your needs. 🏥";
    if (context.type === "visa") return base + "Planning your trip? Ask me about the **144-hour visa-free transit** policy to see if you qualify for a hassle-free entry! ✈️";
    if (context.type === "culture") return base + "Interested in combining health with travel? I can recommend the best **cultural tours** in Beijing and Chengdu! 🐼";
    return base + "I can help you with:\n- 🏥 Choosing the right medical package\n- ✈️ Visa-free travel policies\n- 💳 Setting up Alipay/WeChat Pay\n\n*(Note: I provide logistics support, not medical diagnosis.)*\n\nHow can I help you today?";
  }

  function openChat() {
    state.isOpen = true;
    ui.panel.setAttribute("aria-hidden", "false");
    ui.input.focus();
    ui.toggle.setAttribute("aria-label", "Close chat");
    ui.toggle.title = "Close";
    setStatus(ui.status, "Idle");
    
    // Check if welcome message needs to be (re)rendered based on context or first load
    // We only render if it's the first time OR if we want to reset for page context (optional, but standard is sticky history)
    // Here we stick to sticky history within session, but if empty, we use context welcome.
    if (state.chatMessages.length === 0 && !ui.messages.querySelector(".cmt-chat__msg--assistant")) {
      var context = getPageContext();
      renderMessage(ui.messages, "assistant", getWelcomeMessage(context));
    }
  }

  function closeChat() {
    state.isOpen = false;
    ui.panel.setAttribute("aria-hidden", "true");
    abortActive();
    ui.toggle.focus();
    ui.toggle.setAttribute("aria-label", "Open chat");
    ui.toggle.title = "Chat";
  }

  ui.toggle.addEventListener("click", function () {
    if (state.isOpen) closeChat();
    else openChat();
  });

  ui.closeBtn.addEventListener("click", closeChat);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && state.isOpen) closeChat();
  });

  function onSend() {
    var text = ui.input.value.trim();
    if (!text) return;

    ui.input.value = "";

    renderMessage(ui.messages, "user", text);
    var assistantBubble = renderMessage(ui.messages, "assistant", "");

    var snapshot = state.chatMessages.slice();
    var context = getPageContext();
    
    // Inject context as a system message at the beginning of the array for this turn
    // This ensures the AI knows where the user is.
    var contextMessage = { 
        role: "system", 
        content: `[System Context] User is currently viewing the '${context.title}' page. Prioritize providing information relevant to ${context.topic}.` 
    };

    var messagesToSend = [contextMessage].concat(snapshot).concat([{ role: "user", content: text }]);

    var payload = {
      messages: messagesToSend,
      stream: true,
      temperature: 0.5,
    };

    state.lastPayload = payload;
    streamChat(ui, payload, assistantBubble, {}).then(function (assistantText) {
      if (assistantText) {
        state.chatMessages = snapshot.concat([
          { role: "user", content: text },
          { role: "assistant", content: assistantText },
        ]);
      }
    });
  }

  ui.send.addEventListener("click", onSend);
  ui.input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  });
})();
