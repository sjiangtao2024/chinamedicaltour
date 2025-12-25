# 会员与支付部署指南

## 前置条件
- Cloudflare 账号（已开通 D1 + KV）
- Resend API key + 域名已验证
- PayPal Sandbox 应用凭证
- Google OAuth 客户端凭证
- Cloudflare Turnstile 站点密钥与密钥对

## 账号配置清单（部署前完成）
### Resend（邮箱验证）
1) 注册 Resend 并验证域名 `chinamedicaltour.org`
2) 在域名 DNS 中添加 SPF/DKIM/Return-Path 记录
3) 设置发件人邮箱为 `orders@chinamedicaltour.org`
4) 将 `RESEND_API_KEY` 写入 secrets

### PayPal（沙盒）
1) 为 PayPal 中国企业账户启用 Sandbox
2) 创建 Sandbox 应用，获取 `PAYPAL_CLIENT_ID` 与 `PAYPAL_SECRET`
3) 在 Sandbox 创建 Webhook，获取 `PAYPAL_WEBHOOK_ID`
4) 测试阶段使用 Sandbox，正式上线再切换 Live

### Google OAuth
1) 在 Google Cloud 配置 OAuth 同意屏幕
2) 创建 OAuth Client ID（Web 应用）
3) 授权域名：`chinamedicaltour.org`
4) 回调 URL：`https://chinamedicaltour.org/api/auth/google/callback`
5) 将 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` 写入 secrets

### Turnstile（防恶意注册）
1) 在 Cloudflare Turnstile 创建站点密钥（域名：`chinamedicaltour.org`）
2) 记录 `TURNSTILE_SITE_KEY` 与 `TURNSTILE_SECRET`
3) 将 `TURNSTILE_SECRET` 写入 secrets
4) 将 `TURNSTILE_SITE_KEY` 填入 `public/register.html` 的 `data-sitekey`

## D1 数据库选择
建议为 members/payments **单独新建 D1**。
- 原因：与 smart-cs 聊天记录隔离，避免表结构耦合与权限风险。
- 如必须复用 smart-cs D1，请做好表名前缀与迁移归属隔离。

## 开发流程（worktree）
推荐流程：
1) 创建 worktree 与分支：`git worktree add .worktrees/members-payments -b feat/members-payments`
2) 在 worktree 内开发并提交
3) 将 `feat/members-payments` 合并回主分支
4) 开发完成后移除 worktree：`git worktree remove .worktrees/members-payments`

## 1) 配置 Wrangler 绑定
更新 `workers/members/wrangler.jsonc`：
- D1 绑定：`MEMBERS_DB`
- KV 命名空间：`MEMBERS_KV`
- 变量：`FROM_EMAIL`、`GOOGLE_REDIRECT_URI`、`SMART_CS_LEAD_URL`、`PAYPAL_RETURN_URL`、`PAYPAL_CANCEL_URL`

### 配置清单（放哪里）
写入 `workers/members/wrangler.jsonc`：
- `vars.FROM_EMAIL`（订单/通用发件人）
- `vars.VERIFY_FROM_EMAIL`（验证码专用发件人）
- `vars.GOOGLE_REDIRECT_URI`
- `vars.SMART_CS_LEAD_URL`（如 `https://api.chinamedicaltour.org/api/leads`）
- `vars.PAYPAL_RETURN_URL`（如 `https://chinamedicaltour.org/checkout.html?paypal=return`）
- `vars.PAYPAL_CANCEL_URL`（如 `https://chinamedicaltour.org/checkout.html?paypal=cancel`）
- `d1_databases`：`MEMBERS_DB`（`database_name: cmt_members` + `database_id`）
- `kv_namespaces`：`MEMBERS_KV`（`id`）

使用 `wrangler secret put` 写入（Workers Secrets）：
- `RESEND_API_KEY`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `SMART_CS_LEAD_TOKEN`
- `TURNSTILE_SECRET`

### wrangler.jsonc 示例
```jsonc
{
  "name": "members",
  "main": "src/index.js",
  "compatibility_date": "2025-12-24",
  "compatibility_flags": ["nodejs_compat"],
  "vars": {
    "FROM_EMAIL": "orders@chinamedicaltour.org",
    "VERIFY_FROM_EMAIL": "verify@chinamedicaltour.org",
    "GOOGLE_REDIRECT_URI": "https://chinamedicaltour.org/api/auth/google/callback",
    "SMART_CS_LEAD_URL": "https://api.chinamedicaltour.org/api/leads",
    "PAYPAL_RETURN_URL": "https://chinamedicaltour.org/checkout.html?paypal=return",
    "PAYPAL_CANCEL_URL": "https://chinamedicaltour.org/checkout.html?paypal=cancel"
  },
  "d1_databases": [
    {
      "binding": "MEMBERS_DB",
      "database_name": "cmt_members",
      "database_id": "<your-d1-id>"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "MEMBERS_KV",
      "id": "<your-kv-id>"
    }
  ]
}
```

## 2) 创建 KV 命名空间（建议名：cmt_members_kv）
执行：
```bash
wrangler kv namespace create cmt_members_kv
```
将返回的 ID 填入 `wrangler.jsonc`。

## 3) 创建或绑定 D1 数据库（建议名：cmt_members）
执行：
```bash
wrangler d1 create cmt_members
```
将数据库绑定为 `MEMBERS_DB`。

## 4) 执行迁移
执行：
```bash
wrangler d1 migrations apply MEMBERS_DB --remote
```

## 5) 设置 Secrets
执行：
```bash
wrangler secret put RESEND_API_KEY
wrangler secret put JWT_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put PAYPAL_CLIENT_ID
wrangler secret put PAYPAL_SECRET
wrangler secret put PAYPAL_WEBHOOK_ID
wrangler secret put SMART_CS_LEAD_TOKEN
wrangler secret put TURNSTILE_SECRET
```

## 6) 部署 Worker
执行：
```bash
cd workers/members
wrangler deploy
```

## 7) 部署 smart-cs（接收 leads）
执行：
```bash
cd workers/smart-cs
wrangler deploy
```

## 8) 验证（按流程）
- `GET /health` 返回 `{ ok: true }`
- 注册：`POST /api/auth/start-email` → `POST /api/auth/verify-email` → `POST /api/auth/set-password`
- 登录：`POST /api/auth/login` → `POST /api/auth/session`
- 资料：`POST /api/profile` 成功
- 下单：`POST /api/orders` 成功
- 支付：`POST /api/paypal/create` → PayPal 回跳 `checkout.html` → `POST /api/paypal/capture`
- Google OAuth：完成授权后跳转 `auth-callback.html` 并换取 session
- smart-cs：`POST /api/profile` 后能在 `member_leads` 写入记录

## 部署检查清单
- [ ] Resend 账号已创建并完成域名验证
- [ ] PayPal Sandbox 应用已创建并配置 Webhook
- [ ] Google OAuth 已配置同意屏幕与回调 URL
- [ ] `wrangler.jsonc` 填入 `FROM_EMAIL` 与 `GOOGLE_REDIRECT_URI`
- [ ] `wrangler.jsonc` 填入 `SMART_CS_LEAD_URL`、`PAYPAL_RETURN_URL`、`PAYPAL_CANCEL_URL`
- [ ] `MEMBERS_DB` 绑定到 `cmt_members`
- [ ] `MEMBERS_KV` 绑定到 `cmt_members_kv`
- [ ] Secrets 已写入（Resend/JWT/Google/PayPal/Smart-CS/Turnstile）
- [ ] D1 migrations 已执行
- [ ] Worker 已部署
- [ ] 基本接口验证通过（health/auth/orders/paypal）
 - [ ] smart-cs 已部署并能接收 leads

## 沙盒凭证敏感性说明
请勿将以下内容写入代码仓库或明文配置：
- `PAYPAL_SECRET`
- `PAYPAL_WEBHOOK_ID`
- Sandbox 买家/商家账号的邮箱与密码

`PAYPAL_CLIENT_ID` 建议也仅在后端使用，并通过 Secrets 管理。

## PayPal Sandbox 获取步骤（简版）
1) 进入 https://developer.paypal.com/tools/sandbox/
2) 在 “Accounts” 中创建一个 **Business**（商家）账号和一个 **Personal**（买家）账号
3) 在 “Apps & Credentials” 中创建 Sandbox App
4) 记录 `PAYPAL_CLIENT_ID` 与 `PAYPAL_SECRET`
5) 在 Sandbox App 的 Webhooks 中新增 Webhook，回调 URL 填：
   `https://chinamedicaltour.org/api/paypal/webhook`
6) 记录 `PAYPAL_WEBHOOK_ID`
7) 使用 Personal 账号登录沙盒进行付款测试

## Google OAuth 获取步骤（简版）
1) 进入 Google Cloud Console，选择已有项目
2) OAuth consent screen：填写应用名称、支持邮箱、授权域名
3) 进入 “Credentials” 创建 OAuth Client ID（Web 应用）
4) Authorized domain：`chinamedicaltour.org`
5) Authorized redirect URI：`https://chinamedicaltour.org/api/auth/google/callback`
6) 记录 `GOOGLE_CLIENT_ID` 与 `GOOGLE_CLIENT_SECRET`

## Resend 域名验证步骤（简版）
1) 登录 Resend 控制台，添加域名 `chinamedicaltour.org`
2) 按提示添加 SPF/DKIM/Return-Path DNS 记录
3) 等待验证通过后设置发件人邮箱 `orders@chinamedicaltour.org`
4) 记录 `RESEND_API_KEY` 并写入 secrets
