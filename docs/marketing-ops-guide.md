# Marketing Operations Guide: Promotions & Campaigns

This document outlines how to manage, enable, and disable special marketing campaigns on the China Medical Tour website using our **Modular Promotion System**.

## 🚀 The Promotion Manager (Modular System)

We have upgraded the website to use a **Configuration-Driven** approach. Instead of editing HTML classes manually, you now control all promotions from a single configuration file.

### 1. How to Turn Modules ON/OFF

**Target File:** `public/assets/js/promotions.js`

This file contains a configuration object called `PROMOTIONS`.

```javascript
const PROMOTIONS = {
    // 1. HERO SECTIONS (Set ONE to true)
    'christmas_hero': true,      // Replaces standard hero with Christmas theme
    
    // 2. CONTENT SECTIONS (Set ANY to true)
    'executive_pass': true,      // The ~$5,000 executive package section
    'new_year_countdown': false  // Future module example
};
```

*   **To Enable a Promo:** Change `false` to `true`.
*   **To Disable a Promo:** Change `true` to `false`.
*   **Save the file.** The changes apply immediately upon refreshing the browser.

### 2. How It Works (Technical)

When the page loads, `promotions.js` reads the config and automatically:
1.  Adds specific classes to the `<html>` tag (e.g., `enable-christmas_hero`).
2.  **Conflict Resolution:** If a special hero (like Christmas) is enabled, the script automatically adds `hide-standard-hero` to hide the default homepage banner.

### 3. Adding New Promotion Modules

If you want to create a NEW promotion in the future (e.g., "Summer Special"):

1.  **Add HTML:**
    Create your section in `index.html` and give it two classes:
    *   `promo-module` (This hides it by default)
    *   `module-summer-special` (Your unique module name)
    
    ```html
    <section class="promo-module module-summer-special">
       <h1>Summer Sale!</h1>
    </section>
    ```

2.  **Add CSS Rule:**
    In the `<style>` block of `index.html` (or `style.css`), add the visibility trigger:
    
    ```css
    html.enable-summer_special .module-summer-special { display: block !important; }
    ```

3.  **Register in Config:**
    Add it to `public/assets/js/promotions.js`:
    ```javascript
    'summer_special': false // Default to false
    ```

### 4. Updating the AI Assistant

**Target File:** `workers/smart-cs/src/lib/knowledge-base.js`

Remember to also update the AI's knowledge base to match the active website promotions.

```javascript
// CONFIGURATION SWITCH
const ENABLE_PROMO = true; // Sync this with your website status
```

## 💳 Payment System Setup (Alipay & WeChat)

The "Executive Vitality Pass" landing page uses a **Merchant QR Code** modal for payments.

### Current Status
The page currently uses **placeholder images**:
- `assets/images/qr_alipay_placeholder.png`
- `assets/images/qr_wechat_placeholder.png`

### 🚀 How to Go Live (Replace with Real Codes)
Once you have applied for your **Merchant (Business) QR Codes** from Alipay and WeChat Pay:

1.  **Prepare Images:** Save your real QR code images as:
    - `qr_alipay.png`
    - `qr_wechat.png`
2.  **Upload:** Place them in the `public/assets/images/` directory.
3.  **Update Code:** Edit `public/executive-pass.html`:
    - Find: `src="assets/images/qr_alipay_placeholder.png"` -> Change to `src="assets/images/qr_alipay.png"`
    - Find: `src="assets/images/qr_wechat_placeholder.png"` -> Change to `src="assets/images/qr_wechat.png"`


npx wrangler deploy --env production