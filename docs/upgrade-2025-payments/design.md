# 会员注册 + PayPal 沙盒支付 + 优惠券升级方案（设计稿）

> 本文档用于评审，先定方案再实施。

## 目标与范围
- 新增会员注册/登录（Google OAuth + 邮箱验证码）
- PayPal 沙盒支付（一次性支付：套餐/定金）
- 优惠券（固定金额/百分比；渠道归因参数为主，券码兜底；不可叠加）
- 支付前补充信息 + 邮件提醒
- 保持 Cloudflare 免费方案可用

## 总体架构与边界
- 新增 `workers/members`，承载公众 API：注册、登录、支付、优惠券、资料补充。
- D1 作为主数据（用户/订单/优惠券/资料），KV 用于验证码与短期会话。
- 前端保持 Pages 静态站，新增独立注册页、资料补充页与支付页，资料在支付前完成。
- 验证规则：支付前必须完成“邮箱验证码”或“Google OAuth”。
- 支付后状态：订单已支付，后续进入预约流程。

## 组件与数据流
页面：
- `/register`：Google OAuth 或邮箱验证码；邮箱验证后设置密码。
- `/login`：邮箱 + 密码登录（或 Google OAuth）。
- `/profile`（对应 `public/profile.html`）：补充信息表单；必须在支付前完成。
- `/checkout`：选择套餐/定金，读取 `?ref=xxx` 归因并自动应用优惠。

数据流：
`register -> verify -> set_password -> login -> session -> profile -> checkout -> create order -> PayPal -> capture -> scheduled`
失败/放弃分支：
`create order -> payment_failed`，`create order -> payment_expired`，`capture -> payment_failed`

## 数据模型（D1）
建议表：
- `users`：email、name、country、preferred_contact、status, created_at, updated_at
- `auth_identities`：user_id、provider、google_sub、password_hash、email_verified_at
- `orders`：user_id、item_type(package/deposit)、item_id、amount_original、discount_amount、amount_paid、currency、ref_channel、coupon_id、paypal_order_id、paypal_capture_id、status、created_at、updated_at
- `user_profiles`：user_id、name、gender、birth_date、contact_info、companions、emergency_contact、email、checkup_date、created_at、updated_at
- `coupons`：code、type(fixed/percent)、value、ref_channel、scope、valid_from、valid_to、usage_limit、used_count

## 核心 API（workers/members）
认证/验证：
- `POST /api/auth/start-email` 发送验证码
- `POST /api/auth/verify-email` 验证邮箱有效性（注册流程）
- `POST /api/auth/set-password` 设置密码（注册流程）
- `POST /api/auth/login` 邮箱 + 密码登录
- `GET /api/auth/google` 跳转 Google
- `GET /api/auth/google/callback` 交换 code（默认回调模板，可替换）
- `POST /api/auth/session` 返回短期 session（建议 JWT，默认 24h，有效期内可直接支付）
- `POST /api/auth/reset-start` 发送重置密码验证码
- `POST /api/auth/reset-password` 验证并重置密码

支付与订单：
- `POST /api/orders` 创建订单（含 ref/coupon）
- `POST /api/paypal/create` 创建 PayPal order
- `POST /api/paypal/capture` 捕获支付并更新状态
- `POST /api/paypal/webhook` 支付异步通知（主路径）
- `GET /api/orders/:id` 查询订单状态

资料补充：
- `POST /api/profile` 提交资料（需鉴权）

## 优惠券与渠道归因
- 以 `?ref=xxx` 自动归因为主，手动券码为兜底。
- 订单只允许使用一张优惠券。
- 记录来源渠道，便于网红推广统计。
优先级规则：
- 若同时存在 ref 与 coupon_code，默认以 ref 归因、coupon_code 仅在未匹配 ref 时生效（避免冲突）。

## 邮件策略（Resend）
- 验证码与支付后提醒邮件使用 Resend。
- 免费额度可用；超量时升级。
- 需完成域名验证以使用 `orders@chinamedicaltour.org`。

## Google OAuth 设置步骤（概要）
- 在 Google Cloud 项目中启用 OAuth 同意屏幕。
- 创建 OAuth Client ID（Web 应用）。
- 配置授权域名 `chinamedicaltour.org`。
- 默认回调模板：`https://chinamedicaltour.org/api/auth/google/callback`（可替换）。
- 在 Cloudflare Secrets 中保存 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`。

## Resend 域名验证步骤（概要）
- 在 Resend 控制台添加域名 `chinamedicaltour.org`。
- 按提示配置 SPF/DKIM/Return-Path DNS 记录。
- 验证通过后将发信人设为 `orders@chinamedicaltour.org`。

## 安全与合规
- 邮箱验证码 10 分钟有效，限制频率与重放（仅用于注册/重置密码）。
- 发送保护（最小集）：同一邮箱/同一 IP 至少 60s 间隔；每日上限（如 5 次/邮箱、20 次/IP）；统一响应避免探测邮箱存在。
- 可选加固：触发频控阈值后启用 Turnstile，人机验证可与验证码发送接口共用。
- OAuth 使用 state 防 CSRF。
- 密码存储使用强哈希（如 argon2/bcrypt），限制登录尝试频率。
- PayPal secret 仅在 Worker 保存，前端不暴露。
- 订单 capture 需幂等处理与金额校验。
- 注册与支付页面均勾选隐私/条款并记录时间戳。
资料策略：
- 支付前补充信息写入 `user_profiles` 作为履约主档。
- 仅将非敏感字段（如姓名、首选联系方式）同步到 `users`，其余保持 `user_profiles` 中隔离。

## 会话与过期策略
- session token 默认有效期 24 小时；过期需重新验证（邮箱或 Google）。
- `payment_expired`：订单创建后 2 小时未完成支付视为过期，前端提示重新下单。

## 支付确认策略（免费方案内可行）
- **主路径**：PayPal Webhook 异步通知，确保用户关闭页面也能更新订单状态。
- **辅路径**：前端回跳后调用 `capture`，用于即时反馈。
- **兜底**：订单查询时可触发一次对账（仅在状态未更新时）。

## 订单幂等策略
- `POST /api/orders` 必须传 `idempotency_key`（前端生成 UUID，后端做唯一约束）。
- 若重复请求命中相同 `idempotency_key`，返回已存在订单，避免重复扣款。

## 免费方案可行性
- Pages + Workers + D1 + KV 均可在免费方案内运行。
- 关注 D1 写入频率与 Resend 免费额度；超量时升级即可。

## Cloudflare 免费方案限制与预案
可行范围：
- 当前流量规模下，Pages 静态站 + 1 个新增 Worker（members）+ D1/KV 足够支撑注册/支付/优惠券流程。
- PayPal 沙盒与邮件发送由外部服务承担，Worker 只做编排与校验。

风险与预案：
- **Workers 请求/CPU 限额**：避免在请求内做重计算；所有外部调用（PayPal/Resend）做超时与降级提示。
- **D1 写入/查询配额**：订单、用户、优惠券写入保持轻量；避免高频写；必要时拆分到 KV 或延迟写入。
- **KV 读写配额**：验证码与会话只保留短期数据，控制发送频率，减少无效重试。
- **无定时任务/资源限制**：过期订单通过查询时懒清理（读到已过期即标记），减少依赖后台批处理。
- **外部服务额度**：Resend 免费额度可能受限，超量时升级或切换备用发信服务。

## 静态站改造最小清单
- 新增独立页面：`public/register.html`、`public/profile.html`、`public/checkout.html`
- 新增入口链接：`public/index.html` 头部/导航增加“会员注册”入口
- 新增前端脚本：`public/assets/js/members.js`（验证码/OAuth/下单/支付回跳/资料提交）
- 新增样式：复用 `public/assets/css/style.css`，必要时补充 `public/assets/css/members.css`
- API 端点约定：前端统一使用同域 `/api/...` 指向 `workers/members`
- 支付回跳处理：在 `checkout` 中完成 `capture` 并跳转到确认/完成页
- 表单校验与提示：最小化校验 + 清晰错误提示
- 文案与合规：注册/支付页勾选隐私与条款，链接 `public/privacy.html` / `public/terms.html`
