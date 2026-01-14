# Members Worker API 清单

本文档汇总 `workers/members` 的对外 API，用于测试与验收。除 `/health` 外，均以 `/api/...` 为前缀。

## Base URL
- `https://members.chinamedicaltour.org`

## 通用约定
- `Content-Type: application/json`
- 需要鉴权的接口使用 `Authorization: Bearer <JWT>`
- Webhook 由 PayPal 回调，无需 JWT，但会校验签名

## Health
- `GET /health`  
  返回 `{ ok: true }`

## Auth
- `POST /api/auth/start-email`  
  发送验证码邮件。Body: `{ email, turnstile_token? }`
- `POST /api/auth/verify-email`  
  校验验证码。Body: `{ email, code, turnstile_token? }`
- `POST /api/auth/set-password`  
  设置密码并创建账号。Body: `{ email, password, name? }`
- `POST /api/auth/login`  
  登录。Body: `{ email, password, turnstile_token? }`
- `POST /api/auth/reset-start`  
  发送重置验证码。Body: `{ email, turnstile_token? }`
- `POST /api/auth/reset-password`  
  重置密码。Body: `{ email, code, password }`
- `POST /api/auth/exchange`  
  OAuth 登录码换 JWT。Body: `{ code }`
- `POST /api/auth/session`  
  直接换 JWT（内部用）。Body: `{ user_id }`
- `GET /api/auth/debug-token`  
  校验 JWT（需 `Authorization`）
- `GET /api/auth/google`  
  跳转到 Google OAuth
- `GET /api/auth/google/callback`  
  Google OAuth 回调

## Profile
- `GET /api/profile`  
  获取用户资料（需 `Authorization`）
- `POST /api/profile`  
  更新用户资料（需 `Authorization`）

## Orders
- `GET /api/orders`  
  用户订单列表（需 `Authorization`）
- `POST /api/orders`  
  创建订单（需 `Authorization`）
- `GET /api/orders/:id`  
  获取订单详情（需 `Authorization`）
- `GET /api/orders/:id/profile`  
  获取订单 Intake 资料（需 `Authorization`）
- `POST /api/orders/:id/cancel`  
  取消未支付订单（需 `Authorization`）
- `POST /api/orders/:id/refund-request`  
  提交退款申请（需 `Authorization`）
- `POST /api/orders/:id/profile`  
  订单资料补充（当前不要求 JWT）

## PayPal
- `POST /api/paypal/create`  
  创建 PayPal 订单（需 `Authorization`）
- `POST /api/paypal/capture`  
  捕获 PayPal 订单（需 `Authorization`）
- `POST /api/paypal/webhook`  
  PayPal Webhook 回调（签名校验）

## Admin
- `GET /api/admin/me`  
  管理员鉴权（需 `Authorization`）
- `GET /api/admin/orders`  
  管理员订单查询（需 `Authorization`，支持 `status/user_id/from/to/limit`）
- `GET /api/admin/orders/:id`  
  管理员订单详情（需 `Authorization`）
- `PATCH /api/admin/orders/:id`  
  更新订单状态（需 `Authorization`）
- `GET /api/admin/payments`  
  PayPal 对账查询（需 `Authorization`，支持 `from/to`）
- `GET /api/admin/coupons`  
  优惠券列表（需 `Authorization`，支持 `limit/offset`）
- `POST /api/admin/coupons`  
  创建优惠券（需 `Authorization`，必填 `issuer_name`、`issuer_contact`）
- `GET /api/admin/refund-requests`  
  退款申请列表（需 `Authorization`）
- `PATCH /api/admin/refund-requests/:id`  
  处理退款申请（需 `Authorization`，status: approved/rejected/completed）
