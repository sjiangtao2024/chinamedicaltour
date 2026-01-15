# 条款更新 Checklist（Terms Version）

## 目的
确保条款文案、版本号、前后端与数据库一致，避免订单与协议记录不一致导致支付失败。

## 适用范围
- Terms & Conditions 文案更新
- 退款政策文案或规则变更
- 影响支付合规或证据链的条款更新

## 更新步骤（最小流程）
1) **更新文案**
   - 更新条款页面内容（Terms 页面）。
2) **更新前端常量**
   - 修改 `new-cmt/src/lib/terms.ts`：
     - `TERMS_VERSION`
     - `TERMS_DOC_ID`
     - `TERMS_LAST_UPDATED`
3) **更新后端版本（订单校验来源）**
   - 同步更新 `service_products.terms_version`（D1 数据）为新版本。
4) **部署前后端**
   - 确保前端提交的 `terms_version` 与后端期望一致。

## 验证清单
- 支付页协议提交成功（`POST /api/agreements` 返回 200/201）。
- 订单 `orders.terms_version` 与协议 `agreement_acceptances.terms_version` 一致。
- `service_products.terms_version` 与前端提交一致。
- 订单详情/后台可显示正确版本号。

## 版本策略建议
- 不要每日变更，只有条款内容发生实质更新时变更版本。
- 版本号建议采用日期（如 `YYYY-MM` 或 `YYYY-MM-DD`）。
- 历史订单不回写，保留当时版本用于审计与证据链。

## 常见问题
- **terms_version_mismatch**
  - 订单写入版本与协议提交版本不一致。
  - 常见原因：前端提交版本与后端 `service_products.terms_version` 不一致。

## 相关文档
- `docs/work/legal/2026-01-14-terms-consent.md`
- `docs/dev/plans/2026-01-14-refund-policy-implementation.md`
