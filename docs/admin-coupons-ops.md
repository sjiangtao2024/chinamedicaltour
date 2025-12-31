# Admin Coupons 操作说明

本文档用于运营同学在后台创建与管理优惠券。后台入口位于 `admin.chinamedicaltour.org`，并通过 `members` Worker 的 `/api/admin/coupons` 接口保存与查询。

## 入口
- 登录 `https://admin.chinamedicaltour.org/auth`
- 登录成功后进入 `https://admin.chinamedicaltour.org/admin/coupons`

## 使用流程
1. 打开 **Coupons** 页面。
2. 点击 **Generate code** 自动生成优惠码，或手动输入自定义优惠码。
3. 填写优惠类型与数值：
   - `percent`：折扣百分比（0-100）。
   - `fixed`：固定金额（以分为单位，后端以整数保存）。
4. 填写 `ref_channel`（渠道标识）。
5. 填写生效时间与失效时间。
6. 填写 `usage_limit`（可用次数上限）。
7. 如需封顶优惠，填写 `max_discount`（仅对 percent 类型有效）。
8. 必填 **Issuer name** 与 **Issuer contact**：
   - `issuer_name`：推广方名称（如网红、合作伙伴）。
   - `issuer_contact`：联系方式（邮箱/手机号/社媒账号，自由文本）。
9. 点击 **Create coupon** 完成创建。

## 字段说明
- `code`：优惠码（大写，唯一）。
- `type`：折扣类型（`percent` 或 `fixed`）。
- `value`：折扣值（百分比或分）。
- `ref_channel`：渠道归因标识。
- `usage_limit`：可用次数上限。
- `used_count`：已使用次数（系统统计）。
- `valid_from` / `valid_to`：生效区间。
- `max_discount`：最大折扣额度（仅 percent）。
- `issuer_name`：来源归属人/团队。
- `issuer_contact`：来源联系方式（自由文本）。

## 常见问题
- **优惠码重复**：系统会提示 `coupon_code_exists`，需更换优惠码。
- **percent 折扣超 100**：系统会拒绝创建。
- **valid_to 小于 valid_from**：系统会拒绝创建。

## 相关接口
- `GET /api/admin/coupons?limit=20&offset=0`
- `POST /api/admin/coupons`

## 备注
- 建议每个推广方使用独立 `ref_channel` + `issuer_name` 组合，便于后续统计对账。
- 目前不提供编辑/禁用入口，变更需由技术侧处理。
