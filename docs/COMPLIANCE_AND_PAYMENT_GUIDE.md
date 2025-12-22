# 支付合规与风控指南 (Compliance & Payment Guide)

本文档旨在确保 "China Medical Tour" 业务在资金流转、平台审核及法律层面的全面合规。

## 1. 网站合规性整改清单 (Website Compliance Checklist)

为了通过支付宝、微信支付及 PayPal 的商家审核（KYC），网站必须包含以下法律页面。

### A. 服务条款 (Terms & Conditions)
**核心定位**：必须明确声明我方为“预约与协助服务方 (Facilitator)”，而非医疗服务提供方 (Provider)。

*   **关键条款模板**：
    > "China Medical Tour acts solely as a facilitator and booking agent. We do not provide medical advice, diagnosis, or treatment. All medical services are provided by the respective third-party hospitals."
*   **退款政策 (Refund Policy) - 必须明确**：
    *   **定金 (Deposit)**: "Non-refundable once the hospital appointment is confirmed." (一旦医院预约确认，定金不可退)
    *   **全款 (Full Payment)**: "80% refund if cancelled 7 days prior to arrival. No refund for cancellations within 24 hours." (到达前7天取消退80%，24小时内不退)
    *   *注意：PayPal 极其看重退款条款的清晰度。*

### B. 隐私政策 (Privacy Policy)
涉及跨境医疗数据传输，需符合 GDPR (欧洲客户) 和 PIPL (中国个保法) 的最小交集。

*   **数据收集声明**：明确收集护照、病历仅用于“预约医院”和“购买保险”。
*   **数据存储**：声明数据加密存储，且不会出售给第三方。

---

## 2. 支付宝/微信支付 (国内商户号) 合规指南

### 申请资质
*   **主体**：必须使用**国内公司营业执照**申请“企业商户号”。
*   **行业类目 (MCC)**：
    *   ✅ **推荐**：旅游服务 (Travel Agencies)、健康咨询 (Health Consulting)、票务代理。
    *   ❌ **禁止**：医疗机构 (Medical Services/Hospitals) —— 除非你有《医疗机构执业许可证》。

### 经营规范
*   **收款名目**：用户扫码时看到的商品名称应为“Travel Package”或“Consulting Service”。
*   **限额处理**：
    *   单笔通常限额 ¥50,000 (约 $7,000)。
    *   如遇大额（如 VIP 套餐），建议拆分为 "Deposit" (定金) 和 "Final Payment" (尾款)，或分多天支付。

---

## 3. PayPal 中国账户 (跨境收款) 避坑指南

### 注册与认证
*   必须注册 **PayPal China Business Account**。
*   需要完成企业实名认证（法人的身份证/护照 + 营业执照）。

### 提现与结汇 (最重要的一环)
PayPal 余额 (USD) -> 提现至国内对公账户 (USD/CNY) -> 银行入账

*   **手续费**：每笔提现收取 $35 USD。建议积累到 $5,000 以上再提现以摊薄成本。
*   **银行入账风控 (SAFE 外管局政策)**：
    *   国内银行收到境外汇入的美元时，会要求企业提供“贸易背景证明”。
    *   **必须提供的材料**：
        1.  **服务合同**：网站生成的 Order Confirmation 或电子合同，明确显示服务内容为“咨询/旅游”。
        2.  **发票 (Invoice)**：与入账金额一致。
    *   **申报代码**：务必申报为 **"服务贸易-旅游服务"** 或 **"服务贸易-咨询服务"**。
    *   *警告*：如果申报为“医疗费”，银行可能会因为你没有“医疗机构跨境结算资质”而原路退回资金。

### 争议处理 (Disputes)
*   **留存证据**：必须保留与客户的沟通记录（WhatsApp/Email）、客户签署的确认单、医院出具的体检完成单。
*   一旦发生 "Item Not Received" 争议，立即提交上述“服务已完成”的证据链。

---

## 4. 推荐的支付架构 (针对本网站)

1.  **小额/定金 ($100 - $500)**
    *   **首选**：支付宝/微信 (引导用户看 Payment Guide)。
    *   **优点**：费率低 (0.6%左右)，实时到账人民币，无汇损风险。

2.  **大额/套餐费 ($1000+)**
    *   **首选**：PayPal (发 Invoice 邮件)。
    *   **优点**：国际用户信任度高。
    *   **成本**：4.4% + 固定费率（交易费） + $35（提现费）。
    *   **策略**：将这部分成本计入套餐定价。

3.  **对公转账 (Bank Transfer / SWIFT)**
    *   **备选**：针对 >$5,000 的 VIP 团单。
    *   **优点**：无平台手续费，合规性最好。
    *   **缺点**：到账慢 (3-5天)。
