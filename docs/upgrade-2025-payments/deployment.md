# 会员与支付部署指南

## 前置条件
- Cloudflare 账号（已开通 D1 + KV）
- Resend API key + 域名已验证
- PayPal Sandbox 应用凭证
- Google OAuth 客户端凭证

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
- 变量：`FROM_EMAIL`、`GOOGLE_REDIRECT_URI`

## 2) 创建 KV 命名空间
执行：
```bash
wrangler kv namespace create MEMBERS_KV
```
将返回的 ID 填入 `wrangler.jsonc`。

## 3) 创建或绑定 D1 数据库
执行：
```bash
wrangler d1 create members_db
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
```

## 6) 部署 Worker
执行：
```bash
cd workers/members
wrangler deploy
```

## 7) 验证
- `GET /health` 返回 `{ ok: true }`
- `POST /api/auth/start-email` 能发送验证码
- `POST /api/orders` 能创建订单
- PayPal sandbox create/capture 流程可完成
