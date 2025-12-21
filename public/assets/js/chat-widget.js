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

    // Use an SVG icon for the chat toggle instead of "CS" text
    var chatIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    chatIcon.setAttribute("width", "24");
    chatIcon.setAttribute("height", "24");
    chatIcon.setAttribute("viewBox", "0 0 24 24");
    chatIcon.setAttribute("fill", "none");
    chatIcon.setAttribute("stroke", "currentColor");
    chatIcon.setAttribute("stroke-width", "2");
    chatIcon.setAttribute("stroke-linecap", "round");
    chatIcon.setAttribute("stroke-linejoin", "round");
    chatIcon.innerHTML = '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>';

    var toggle = el("button", {
      class: "cmt-chat__toggle",
      type: "button",
      "aria-label": "Open chat",
      title: "Chat with us",
    }, [ chatIcon ]);

    var panel = el("div", { class: "cmt-chat__panel", "aria-hidden": "true", role: "dialog", "aria-label": "Chat Assistant" });

    var header = el("div", { class: "cmt-chat__header" });
    header.appendChild(el("div", { class: "cmt-chat__title", text: "Medical Assistant" }));
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

  function openChat() {
    state.isOpen = true;
    ui.panel.setAttribute("aria-hidden", "false");
    ui.input.focus();
    ui.toggle.setAttribute("aria-label", "Close chat");
    ui.toggle.title = "Close";
    setStatus(ui.status, "Idle");
    if (!ui.messages.getAttribute("data-welcome")) {
      ui.messages.setAttribute("data-welcome", "1");
      renderMessage(
        ui.messages,
        "assistant",
        "Hello! I'm your Medical Tour Assistant.\nDisclaimer: I provide information on visas, packages, and logistics. This is NOT medical advice. Please consult a doctor.\n\nHow can I help you today?",
      );
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
    var payload = {
      messages: snapshot.concat([{ role: "user", content: text }]),
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
