# Membership System Design (Business + Pricing)

## Context
This document defines the business-facing membership system aligned with `docs/new-requirements/会员体系.docx`. It focuses on pricing logic, membership tiers, and how the membership value is presented to users. Technical implementation details are covered in a separate document.

## Goals
- Provide a transparent billing model that builds trust.
- Define membership tiers (Guest, Silver, Gold, Diamond) with clear economic value.
- Make savings obvious through a scenario-based calculator.
- Keep rules consistent and computable for the backend and UI.

## Non-Goals
- Database schema or API definitions.
- Authentication, payment processing, or operational workflows.

## Product Structure (Aligned to the Docx)
### 1) Transparency Menu (Pricing Logic)
**Three layers of costs:**
- Hard Costs (third-party receipts): hotels, transport, hospital fees, medications/shipping.
- Soft Costs (team labor): doctor consultation, interpreter, itinerary planning.
- Service Fee (management fee): the company margin and service guarantee.

**Pricing formula:**
1. Discounted hard cost = sum(hard_cost_items) * hard_cost_discount
2. Discounted soft cost = sum(soft_cost_items) * soft_cost_discount (if applicable)
3. Service fee = (discounted hard cost + discounted soft cost) * service_fee_rate
4. Total = discounted hard cost + discounted soft cost + service fee

**Rules and edge cases:**
- Items marked “non-discountable” do not receive tier discounts.
- Receipts for hard costs must be available to the customer.
- Service fee is calculated on discounted subtotal (consistent across tiers).

### 2) Membership Tiers (Benefits Matrix)
Each tier is defined by:
- Annual fee
- Service fee rate
- Hard cost discount
- Included benefits (consultation count + doctor level)
- Service scope (itinerary depth, concierge response time)
- Green channel access level

**Suggested tier structure (from docx):**
- Guest: 25% service fee, no discounts, no included consults.
- Silver: 20% service fee, 5% hard cost discount, no free consults.
- Gold: 12% service fee, 10% hard cost discount, 1 free associate-chief consult, itinerary customization.
- Diamond: 8% service fee, 15% hard cost discount, 3 free chief consults, full concierge, highest green channel.

### 3) Savings Calculator (Scenario-Based Proof)
Three canonical scenarios illustrate break-even and high-savings cases:
- A: TCM wellness trip (breakeven for Silver).
- B: VIP checkup with imaging (Gold yields strong savings).
- C: Surgery/family trip (Diamond yields maximum value).

**Calculator inputs:**
- Budget split: hard_cost_total, soft_cost_total
- Need consult? (yes/no), doctor level
- Need itinerary planning? (yes/no)

**Calculator outputs:**
- Total per tier
- Absolute savings vs Guest
- Clear “Total Savings” highlight

## User Experience Notes
- Display “savings amount” as a bold callout.
- Explain doctor rank via tooltip.
- Show a concierge app mockup to emphasize exclusivity.

## Guardrails
- “No hidden fees” backed by receipts for hard costs.
- “Higher tier = lower management fee” must be visually obvious.
- All calculations must be identical between UI and backend to avoid disputes.

## Open Questions
- Whether soft costs receive discounts or only benefits/waivers.
- Whether some hospitals or special services are excluded from discounts.

