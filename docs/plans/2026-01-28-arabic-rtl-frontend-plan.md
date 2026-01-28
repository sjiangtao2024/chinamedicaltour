# Arabic RTL Frontend Implementation Plan (Web)

## Goal
Enable Arabic (RTL) experience for the frontend marketing site without impacting other languages.

## Scope (In)
- RTL infrastructure for `/ar/*` routes
- Arabic translations for the frontend marketing pages
- RTL layout adaptation: navigation, cards, forms, icons, and core layout blocks
- QA checklist for RTL regressions

## Scope (Out)
- Member center, payment, and admin routes
- Backend changes
- SEO localization beyond Arabic

## Assumptions
- Existing i18n routing already supports `/ar` prefix
- Arabic translations can be delivered by product/content owner or professional translator
- We will not duplicate page code; RTL applied via `dir="rtl"` and scoped CSS

## Recommended Approach
- Keep a single codebase + `/ar` locale
- Apply RTL via `[dir="rtl"]` selectors and logical properties
- Use a dedicated Arabic font and slightly larger type scale

## Phases

### Phase 1: RTL Infrastructure (1–2 days)
- Add `dir="rtl"` and `lang="ar"` switching on locale change
- Add global RTL style layer (e.g. `rtl.css` or Tailwind utilities)
- Standardize directional utilities (e.g. `text-left` → logical alignment)
- Identify and flip directional icons (arrows, chevrons, stepper indicators)

### Phase 2: Component Adaptation (2–3 days)
- Header/nav dropdown alignment + mobile menu direction
- Hero, card grids, split sections (image/text)
- Buttons, badges, CTA alignment, and icon placement
- Forms: inputs, labels, placeholders, country code dropdown

### Phase 3: Content Translation (1–2 days, parallel)
- Translate all marketing page strings to Arabic (MSA)
- Validate tone: formal, medical, risk-aware
- Verify typography, line breaks, and readability

### Phase 4: QA & Refinement (1–2 days)
- RTL QA checklist execution
- Fix spacing, overflow, truncation, icon direction issues
- Cross-device sanity check (desktop + mobile)

## Estimated Effort (Frontend Only)
- Total: ~4–8 days (1 person)

## Deliverables
- RTL-ready frontend for `/ar` routes
- Arabic translation files
- RTL QA checklist completed

## Risks
- Inconsistent directionality across legacy components
- Iconography and inline SVGs require manual overrides
- Content length in Arabic causing layout shifts

## RTL QA Checklist
- Global `dir="rtl"` + `lang="ar"` set on Arabic routes
- Text alignment right; forms cursor right
- Nav/menu order mirrors correctly
- Directional icons flipped
- Lists, timelines, and stepper components visually correct
- No LTR-only margin/padding assumptions

## Notes
- New RTL rules must be isolated to `[dir="rtl"]` to avoid affecting other languages.
