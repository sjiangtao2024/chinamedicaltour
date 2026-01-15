# 智能客服部署操作手册 (Deployment Guide)

**适用对象:** 开发人员 / 运维
**目标:** 将 `smart-cs` 后端部署到 Cloudflare Workers。

## 前置条件
1.  已安装 Node.js (v18+)。
2.  拥有 Cloudflare 账号。
3.  已获取 Longcat API Key (至少 1 个)。

---

## 第一步：环境准备

打开终端 (Terminal) 或 VS Code 终端，进入 Worker 目录：

```bash
cd workers/smart-cs
npm install
```

这将安装 `wrangler` 和其他必要的依赖。

---

## 第二步：设置密钥 (Secrets)

**注意:** API Key **绝对不能** 提交到代码库中。必须通过 Cloudflare 的加密存储 (Secrets) 来管理。

运行以下命令（需要交互式输入）：

### 1. 登录 Cloudflare (首次运行需要)
```bash
npx wrangler login
```
*浏览器会弹出，请点击 "Allow" 授权。*

### 2. 设置 Staging 环境密钥 (测试用)
```bash
npx wrangler secret put LONGCAT_API_KEYS --env staging
```
*   **提示:** 当终端提示 `Enter a secret value:` 时，粘贴您的 Key。
*   **多 Key 格式:** `sk-key1,sk-key2,sk-key3` (中间用逗号分隔，无空格)。

### 3. 设置 Production 环境密钥 (正式上线用)
```bash
npx wrangler secret put LONGCAT_API_KEYS --env production
```
*同样输入您的 Key 列表。*

---

## 第三步：部署代码

### 1. 部署到 Staging
```bash
npx wrangler deploy --env staging
```
*   **预期输出:** `Published smart-cs-staging (x.xx sec) ... https://smart-cs-staging.<your-subdomain>.workers.dev`
*   **测试:** 您可以使用 Postman 或 curl 向这个 URL 发送 POST 请求进行测试。

### 2. 部署到 Production (正式版)
```bash
npx wrangler deploy --env production
```
*   **注意:** 生产环境在 `wrangler.jsonc` 中绑定了自定义域名 `api.chinamedicaltour.org`。
*   **DNS 设置:** 如果部署成功但无法访问，请去 Cloudflare Dashboard -> Workers & Pages -> smart-cs -> Settings -> Triggers，确认 Custom Domains 是否已激活。

---

## 第四步：前端集成 (可选)

如果后端 URL 发生变化（例如您没有使用 `api.chinamedicaltour.org`，而是使用了 `workers.dev` 域名），您需要更新前端代码：

1.  打开 `public/assets/js/chat-widget.js`。
2.  找到 `const API_URL` 变量。
3.  将其修改为您刚刚部署获得的 Worker URL。
4.  提交并推送前端代码到 GitHub。

---

## 常用命令速查

| 动作 | 命令 |
| :--- | :--- |
| **本地开发 (模拟)** | `npm run dev` |
| **查看实时日志** | `npx wrangler tail --env production` |
| **检查部署状态** | `npx wrangler deployments list --env production` |
