# Smart CS System Guide (Sunny AI)

This document outlines the architecture, features, and configuration of the **Smart CS (Sunny)** system for China Medical Tour.

## 1. System Overview

**Sunny** is an intelligent, context-aware AI assistant designed to guide international patients through their medical tourism journey in China.

*   **Persona**: Sunny (小晴) - A friendly, professional, young Chinese female assistant.
*   **Core Capability**: Strictly English-only responses, no coding support, focused purely on medical tourism logic (Visa, Payment, Packages).
*   **Tech Stack**: Cloudflare Workers (Backend) + Vanilla JS Widget (Frontend).

## 2. Key Features

### A. Context Awareness (Context Injection)
Sunny knows which page the user is currently viewing and adapts her behavior accordingly.

*   **Mechanism**: The frontend (`chat-widget.js`) detects the current URL path (`window.location.pathname`).
*   **Implementation**:
    *   **Welcome Message**: A specific welcome message is generated based on the page context (e.g., asking about Alipay on the Payment page).
    *   **System Context**: A hidden system message is prepended to the chat history sent to the backend: `[System Context] User is currently viewing the 'Payment Guide' page...`. This cues the AI to prioritize relevant knowledge.

### B. Quick Replies (Chips)
To lower the barrier for interaction, context-sensitive "Quick Reply" buttons are displayed when the chat opens.

*   **Logic**: `getQuickReplies(context)` in `chat-widget.js` returns an array of strings based on the page type.
*   **Examples**:
    *   *Payment Page*: ["How to setup Alipay?", "Transaction fees?"]
    *   *Visa Page*: ["144h Transit Rule", "Invitation Letter"]

### C. Visual Identity
*   **Avatar**: A 3D-style avatar (`ai_avatar_sunny.png`) appears next to every assistant message.
*   **Animation**: The chat toggle button features a "pulse" animation to attract attention.
*   **Markdown**: Responses support Markdown rendering (bold, lists, headings) via `marked.js`.

### D. Security & Boundaries
*   **Backend Enforced**: The system prompt (`knowledge-base.js`) on the Worker strictly forbids code generation and off-topic discussions.
*   **Privacy**: No sensitive user data is stored persistently in the browser beyond the session.

## 3. Configuration & Maintenance

### Frontend (`public/assets/js/chat-widget.js`)
*   **`getPageContext()`**: Define new page contexts here.
*   **`getWelcomeMessage()`**: Customize the greeting text for each context.
*   **`getQuickReplies()`**: Update the list of suggested questions.

### Backend (`workers/smart-cs/src/lib/knowledge-base.js`)
*   **`CORE_KNOWLEDGE`**: The source of truth for the AI. Update prices, policies, and hospital info here.
*   **`getSystemPrompt()`**: Defines the "Sunny" persona and strict constraints.

### Ops Admin Token (RAG 后台)
*   **用途**: 访问 `ops.chinamedicaltour.org` 的后台上传与重建功能。
*   **当前 Token**: `eZfpq4Mofu9sB42srYOvA78dmmHEKZij`
*   **配置方式**: 在部署 ops Worker 前，用 `wrangler secret put ADMIN_TOKEN` 注入。
*   **轮换建议**: 每 1-3 个月轮换一次，轮换后同步更新此文档。

## 4. Deployment

To update the system:

1.  **Frontend Changes** (UI, Welcome messages):
    ```bash
    git add .
    git commit -m "update chat widget"
    git push
    ```

2.  **Backend Changes** (AI Knowledge, Persona):
    ```bash
    cd workers/smart-cs
    npx wrangler deploy --env production
    ```

## 5. Troubleshooting

*   **AI answering in Chinese?** Check `workers/smart-cs/src/lib/truncate.js` to ensure it's not overwriting the system prompt (fixed in v1.1).
*   **"Chart.js not loaded" warning?** This is harmless and suppressed on non-chart pages.
*   **Icons missing?** Ensure `lucide.js` is loaded locally (`assets/vendor/lucide.js`) instead of CDN.
