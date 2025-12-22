const UI_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Ops Knowledge Editor</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; }
      textarea { width: 100%; min-height: 320px; }
      .row { margin: 12px 0; }
      .hidden { display: none; }
      .status { margin-top: 10px; }
      button { padding: 8px 14px; }
      input[type=password] { padding: 6px; width: 320px; }
    </style>
  </head>
  <body>
    <h1>Ops Knowledge Editor</h1>

    <div id="login-panel">
      <div class="row">
        <label>Admin Token</label>
      </div>
      <div class="row">
        <input id="token" type="password" placeholder="Enter admin token" />
        <button id="login">Login</button>
      </div>
      <div id="login-status" class="status"></div>
    </div>

    <div id="editor-panel" class="hidden">
      <div class="row">
        <label>Update Note (optional)</label>
        <input id="note" type="text" style="width: 100%;" />
      </div>
      <div class="row">
        <label>Knowledge (Markdown)</label>
        <textarea id="content"></textarea>
      </div>
      <button id="save">Save & Upload</button>
      <div id="save-status" class="status"></div>
    </div>

    <script>
      const loginBtn = document.getElementById('login');
      const tokenInput = document.getElementById('token');
      const loginStatus = document.getElementById('login-status');
      const editorPanel = document.getElementById('editor-panel');
      const loginPanel = document.getElementById('login-panel');
      const saveBtn = document.getElementById('save');
      const saveStatus = document.getElementById('save-status');
      const contentEl = document.getElementById('content');
      const noteEl = document.getElementById('note');

      function setStatus(el, text, ok) {
        el.textContent = text;
        el.style.color = ok ? 'green' : 'red';
      }

      async function auth(token) {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token }
        });
        return res.ok;
      }

      loginBtn.addEventListener('click', async () => {
        const token = tokenInput.value.trim();
        if (!token) return setStatus(loginStatus, 'Token required', false);
        setStatus(loginStatus, 'Checking...', true);
        try {
          const ok = await auth(token);
          if (!ok) return setStatus(loginStatus, 'Invalid token', false);
          loginPanel.classList.add('hidden');
          editorPanel.classList.remove('hidden');
          setStatus(loginStatus, 'OK', true);
          window.__token = token;
        } catch (e) {
          setStatus(loginStatus, 'Auth failed', false);
        }
      });

      saveBtn.addEventListener('click', async () => {
        const token = window.__token;
        if (!token) return setStatus(saveStatus, 'Not authenticated', false);
        const content = contentEl.value.trim();
        if (!content) return setStatus(saveStatus, 'Content required', false);
        setStatus(saveStatus, 'Uploading...', true);
        try {
          const res = await fetch('/api/knowledge', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + token,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              content_markdown: content,
              note: noteEl.value.trim()
            })
          });
          if (!res.ok) {
            setStatus(saveStatus, 'Upload failed', false);
            return;
          }
          const data = await res.json();
          setStatus(saveStatus, 'Uploaded: ' + data.key, true);
        } catch (e) {
          setStatus(saveStatus, 'Upload error', false);
        }
      });
    </script>
  </body>
</html>
`;

export function getUiHtml() {
  return UI_HTML;
}
