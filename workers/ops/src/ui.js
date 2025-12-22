const UI_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Ops Knowledge Editor</title>
  </head>
  <body>
    <h1>Ops Knowledge Editor</h1>
    <label>Admin Token</label>
    <input id="token" type="password" />
    <button id="login">Login</button>
    <div id="app" hidden></div>
  </body>
</html>
`;

export function getUiHtml() {
  return UI_HTML;
}
