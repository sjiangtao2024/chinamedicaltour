# VIP Guided Services (vipservices.chinamedicaltour.org) - Design

## Summary

Build a VIP guided-service experience inside the existing `new-cmt` frontend. The VIP flow is a set of step-by-step pages (one stage per page) that let users select services based strictly on `docs/new-requirements/2026医疗旅游全链路成本.md` with the requested removals/edits. The same app serves both domains; `vipservices.chinamedicaltour.org` should map to the VIP route.

## Goals

- Provide a guided, stage-by-stage service selector (one stage per page).
- Keep UI consistent with the existing site styling and components.
- Use USD as the default display currency with a fixed RMB -> USD conversion and a 10% buffer.
- Support live conversion to EUR/GBP/SGD on the frontend.
- Avoid creating any service not present in the source document.

## Non-Goals

- No new service categories beyond the source document.
- No multi-language implementation beyond existing structure (default English, no Chinese).
- No backend price calculations (all done in frontend).

## Information Architecture

- Route prefix: `/vip-services` within the existing app.
- 7 pages total:
  1. VIP overview / start page (explains flow and stages)
  2. Stage 1: Pre-Arrival Phase
  3. Stage 2: Arrival & Logistics
  4. Stage 3: Medical Execution
  5. Stage 4: Recovery & Tourism
  6. Stage 5: Departure & Follow-up
  7. Stage 6: Post-op / Post-illness Follow-up (Coming Soon)
- Global summary page at the end showing selected services and totals.

## Stage Definitions and Service List (Source-locked)

All prices are taken from the source document and use **upper bounds** when a range is given.

### Stage 1: Pre-Arrival Phase

- Initial Consultation (soft cost only, display as service with price 0)
- Inbound Translation (¥1,500)
- Remote Expert Pre-diagnosis (¥2,000)
- Visa/Invitation Letter (¥5,000)
- Itinerary & App Guidance (¥0, keep, mark "Under review")
- Planning Deposit (display as optional, upper bound $500)

### Stage 2: Arrival & Logistics

- VIP Airport Pickup (¥800)
- Welcome Kit → **Replace with Pocket Wi-Fi** (¥300)
- Accommodation Arrangement (¥8,000)
- Dedicated Driver (¥7,500)

### Stage 3: Medical Execution

- Registration & Public Relations → **Rename to Green Channel Management** (¥5,000)
- Add **Registration** (¥600)
- Specimen/Report Runner (¥200)
- Inpatient/Personal Care Assistant (¥400/day)
- Remove **Full-time Bilingual Medical Escort**

### Stage 4: Recovery & Tourism

- Sightseeing & Experience → **Acupuncture or Massage** (¥2,000)
- Dining Reservations (¥800 per person)
- Remove **24h Emergency Response**

### Stage 5: Departure & Follow-up

- Remove **Departure Assistance**
- Outbound Translation → **Hospital Discharge Summary / Surgery Record / Pathology Report Translation** (¥2,000)
- Remove **Insurance Claim Assistance**

### Stage 6: Post-op / Post-illness Follow-up

- Post-op follow-up and subsequent checks (Coming Soon; no price shown)

## Pricing and Currency Rules

- Base currency in document: RMB.
- USD calculation is fixed: `USD = RMB / 7.2 * 1.10` (10% buffer).
- All range prices are displayed using the upper bound.
- Currency switcher: USD (default), EUR, GBP, SGD.
- Non-USD conversions use live FX from `exchangerate.host` on the frontend, converting from USD to target currency.
- Display a short disclaimer: "Prices converted from RMB at 1 USD = 7.2 RMB with 10% buffer. Other currencies use live FX."

## UX and Layout

- Reuse existing layout, typography, colors, spacing, and components.
- Each stage page includes:
  - Stage title + short goal description.
  - Progress indicator (Step X/6).
  - Service cards with: name, short description, price, and select toggle.
  - "Save selection" secondary action and "Continue" primary CTA.
- Stage 6 is locked/disabled with "Coming Soon" badge.
- Final summary page lists selected services with totals.

## Flow Diagram Assets

- Desktop flow diagram
  - Filename: vip-services-flow.png
  - Resolution: 1920x800
  - File type: PNG
  - Prompt: "Create a clean, modern horizontal flow diagram for a VIP medical travel service journey. 5 steps in a single row with clear numbered circles and simple line connectors. Steps: 1) Create Account (Email/Google, require WhatsApp or WeChat), 2) Prepare Mobile Payments (Alipay/WeChat Pay; China is cashless), 3) Select Services (Mandatory vs Optional), 4) Confirm Plan & Pay, 5) Concierge Follow-up (WhatsApp/WeChat). Use a light, airy background with subtle gradient, soft teal and navy accents, rounded cards, minimal icons, readable sans-serif type, and short one-line captions. Keep plenty of white space and align content for web header placement."
- Mobile flow diagram
  - Filename: vip-services-flow-mobile.png
  - Resolution: 1080x1920
  - File type: PNG
  - Prompt: "Create a clean, modern vertical flow diagram for a VIP medical travel service journey optimized for mobile. 5 stacked steps with large numbered badges, bigger icons, and one short line of text per step. Steps: 1) Create Account (Email/Google, require WhatsApp or WeChat), 2) Prepare Mobile Payments (Alipay/WeChat Pay; China is cashless), 3) Select Services (Mandatory vs Optional), 4) Confirm Plan & Pay, 5) Concierge Follow-up (WhatsApp/WeChat). Use a light background, soft teal and navy accents, generous spacing, and high contrast for small screens. Keep the layout narrow and centered for phone view."

## Domain Mapping

- `vipservices.chinamedicaltour.org` should resolve to `/vip-services` within the same app.

## Open Questions

- None for this phase (implementation can proceed).

## Delivery Artifacts

- New VIP pages and routing within `new-cmt`.
- Pricing logic and currency conversion helper.
- Updated copy and services per the source document and this design.
