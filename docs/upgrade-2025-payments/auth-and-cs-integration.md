# 登录鉴权与智能客服资料同步（方案）

本文用于评审：补齐登录/鉴权流程，并在用户提交资料后同步到智能客服。

## 目标
- 完整登录与会话鉴权（邮箱验证码 / Google OAuth）
- 资料在支付前完成
- 将客户资料同步到智能客服（smart-cs）

## 推荐工作流（支付前资料）
1) 注册（邮箱验证码验证有效性）并设置密码 / Google OAuth
2) 登录（邮箱+密码或 Google OAuth）
3) 创建会话（JWT）
4) 提交资料（profile）
5) 选择套餐并创建订单
6) PayPal 支付并确认

## 登录与鉴权（最佳方案）
### 前端
- 注册：邮箱验证码验证后引导设置密码
- 登录成功后调用 `POST /api/auth/session` 获取 JWT
- JWT 存在 `sessionStorage`（或内存），避免长期留存
- 需要保护的请求在 `Authorization: Bearer <token>` 中携带

### 后端
- `POST /api/auth/session` 生成 24h JWT（已有）
- 需要保护的接口校验 JWT（建议：profile/checkout/订单操作）
- 未认证用户只能访问：`/api/auth/*`、`/health`

## 资料收集（支付前）
当前 `POST /api/orders/:id/profile` 依赖订单 ID，不适合支付前。
建议新增独立资料表与接口：
- 新表：`user_profiles`（以 `user_id` 为主键或唯一约束）
  - `user_id`, `name`, `gender`, `birth_date`, `contact_info`,
    `companions`, `emergency_contact`, `email`, `checkup_date`,
    `created_at`, `updated_at`
- 新接口：`POST /api/profile`
  - 需要 JWT
  - 写入 `user_profiles`
- `checkout` 前要求 `user_profiles` 已存在

## 智能客服同步（最佳方案）
### 方案选择
采用 smart-cs 新增 webhook 接收资料，并写入 smart-cs 自身 D1。
优点：实时同步、结构清晰、实现改动小。

### smart-cs 侧改动
- 新增表：`member_leads`
  - `id`, `user_id`, `email`, `name`, `contact_info`, `checkup_date`,
    `companions`, `emergency_contact`, `source`, `created_at`
- 新增接口：`POST /api/leads`
  - 鉴权：`Authorization: Bearer <SMART_CS_LEAD_TOKEN>`
  - 仅接受非敏感字段
  - 用途：仅允许 members 服务同步 lead，防止外部伪造或滥用

### members 侧改动
- 在资料提交成功后调用 smart-cs：
  - URL：`SMART_CS_LEAD_URL`（如 `https://api.chinamedicaltour.org/api/leads`）
  - Header：`Authorization: Bearer <SMART_CS_LEAD_TOKEN>`
  - Payload：`email/name/contact_info/checkup_date/companions/emergency_contact`
- 失败策略：记录日志，不阻塞主流程

## 新增/调整配置项
### members secrets
- `JWT_SECRET`（已有）
- `SMART_CS_LEAD_URL`
- `SMART_CS_LEAD_TOKEN`

### smart-cs secrets
- `SMART_CS_LEAD_TOKEN`（与 members 保持一致）

## 实施步骤（概要）
1) smart-cs：新增 `member_leads` 表 + `POST /api/leads`
2) members：新增 `user_profiles` 表 + `POST /api/profile`
3) 前端：验证成功后获取 JWT，并在资料/订单请求中携带
4) 前端：资料提交成功后进入 checkout

## 兼容性与风险
- 需要更新 CORS 允许 `chinamedicaltour.org` 与 `members.chinamedicaltour.org`
- 资料同步只发非敏感字段，避免合规风险
