# Contract: Error Codes (Smart CS v1)

**Source of truth**: `docs/plan-cs.md`（错误码映射表）

| HTTP Status | error_code | message (UI 文案) | Retry Guidance |
|---:|---|---|---|
| 400 | `invalid_request` | 请求格式有误，请刷新页面重试。 | 不重试 |
| 429 | `rate_limit_exceeded` | 咨询人数过多，请稍等片刻。 | 建议退避重试 |
| 503 | `upstream_service_unavailable` | AI 服务暂不可用，请稍后重试。 | 允许用户点击重试 |
| 504 | `gateway_timeout` | 连接超时，请检查网络。 | 前端自动重试 1 次 |

## Notes

- Worker 日志必须包含 `error_code`，以便 UI 文案与故障类型可回溯。
- 任何新增 error_code 必须同步更新 `docs/plan-cs.md` 与前端文案表。

