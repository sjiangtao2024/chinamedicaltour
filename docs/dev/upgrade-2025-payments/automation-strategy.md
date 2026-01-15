# PayPal 支付自动化测试方案 (Playwright)

> **状态**: 建议书
> **目标**: 实现“注册 -> 下单 -> PayPal 支付 -> 回调验证”的全链路自动化，减少人工测试成本。

## 1. 为什么选择 Playwright

在支付测试场景中，我们推荐使用 [Playwright](https://playwright.dev/)，原因如下：

1.  **多页面/弹窗支持**: PayPal 支付通常会弹出一个新窗口或重定向到 `paypal.com`。Playwright 能完美控制多个页面上下文，这是 Cypress 等框架的弱项。
2.  **不仅是 API**: 我们可以真实模拟用户点击“Pay Now”按钮，这是验证 PayPal 集成最关键的一步。
3.  **身份隔离**: Playwright 支持 `BrowserContext`，可以轻松模拟“买家 A”和“买家 B”同时操作，互不干扰。

## 2. 架构设计

### 2.1 目录结构 (建议)
```text
new-cmt/
├── e2e/
│   ├── config/
│   │   └── global-setup.ts      # 登录前置准备
│   ├── pages/
│   │   ├── CheckoutPage.ts      # 封装结账页操作
│   │   └── PayPalPage.ts        # 封装 PayPal 页面操作
│   └── specs/
│       └── payment-flow.spec.ts # 核心测试脚本
├── playwright.config.ts         # 配置文件
└── .env.test                    # 存放沙盒账号密码
```

### 2.2 关键流程逻辑

```typescript
test('用户能使用 PayPal 完成白银套餐支付', async ({ page, context }) => {
  // 1. 在商户侧下单
  await page.goto('/checkout');
  await page.getByText('Silver Package').click();

  // 2. 等待 PayPal 弹窗/跳转
  const [paypalPage] = await Promise.all([
    context.waitForEvent('page'), // 等待新窗口弹出
    page.click('#paypal-button')
  ]);

  // 3. 在 PayPal 侧操作 (自动化最难点)
  await paypalPage.waitForLoadState('networkidle');

  // 填写沙盒账号 (从环境变量读取)
  await paypalPage.getByLabel('Email').fill(process.env.SANDBOX_EMAIL);
  await paypalPage.getByRole('button', { name: 'Next' }).click();
  await paypalPage.getByLabel('Password').fill(process.env.SANDBOX_PASSWORD);
  await paypalPage.getByRole('button', { name: 'Log In' }).click();

  // 点击最终支付
  await paypalPage.getByRole('button', { name: 'Complete Purchase' }).click();

  // 4. 验证回到商户侧
  await expect(page).toHaveURL(/.*\/payment\/success/);
  await expect(page.getByText('Payment Successful')).toBeVisible();
});
```

## 3. 环境适配 (WSL 2)

既然开发环境位于 WSL 2 (Windows Subsystem for Linux)，我们需要特别注意以下配置。

### 3.1 运行模式选择
*   **无头模式 (Headless Mode)**: Playwright **默认**以无头模式运行。这在 WSL 2 中完美支持，不需要任何图形界面支持，非常适合自动化脚本运行。
    *   运行命令: `npx playwright test`
*   **有头模式 (Headed Mode)**: 如果需要观察浏览器操作过程（调试用），需要 WSLg 支持（Windows 11 默认支持）。
    *   运行命令: `npx playwright test --headed`

### 3.2 依赖安装 (关键)
在 WSL 2 中首次安装 Playwright 时，必须安装 Linux 浏览器所需的系统依赖库。

```bash
# 1. 安装 Playwright 包
npm install -D @playwright/test

# 2. 安装浏览器二进制及系统依赖 (必须执行)
npx playwright install --with-deps
```
*注意: `--with-deps` 参数会自动安装 Ubuntu/Debian 缺少的库（如 libgtk, libnss 等），没有这一步浏览器将无法启动。*

## 4. 实施难点与对策

### 4.1 PayPal 页面加载慢/不稳定
*   **现象**: 沙盒环境通常比正式环境慢，容易超时。
*   **对策**: 在 `playwright.config.ts` 中设置较长的 `actionTimeout` (如 30秒)，并使用 `waitForLoadState('networkidle')` 智能等待。

### 3.2 验证码 (Captcha)
*   **现象**: 即使是沙盒账号，频繁登录也可能触发验证码。
*   **对策**:
    1.  **推荐**: 在测试运行期间保持 Session (复用 `storageState`)，避免每次都登录。
    2.  **备选**: 如果遇到验证码，测试标记为 "Flaky" 或跳过。

### 3.3 动态选择器
*   **现象**: PayPal 页面经常更新 DOM ID，导致选择器失效。
*   **对策**: 使用 **可访问性选择器** (Accessibility Locators)，如 `getByRole('button', { name: 'Pay' })`，而不是 `css=#btn-pay-123`。这种方式更稳定。

## 4. 安全注意事项

*   **绝对不要** 将沙盒密码提交到 Git 仓库。
*   使用 `.env.test` 文件并在 `.gitignore` 中排除它。
*   在 CI/CD (如 Github Actions) 中使用 Secrets 注入环境变量。

## 5. 下一步建议

如果您决定采纳此方案，我们可以：
1.  在 `new-cmt` 项目中安装 Playwright。
2.  先写一个简单的脚本，只做“打开 PayPal 登录页”这一步，验证可行性。
