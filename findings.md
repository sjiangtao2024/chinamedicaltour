# Findings & Decisions

## Requirements
- Optimize SEO for new-cmt with English focus.
- Use canonical domain: https://chinamedicaltour.org.
- Indexable pages: /, /health-screening, /specialized-care, /tcm-wellness, /concierge-services, /stories, /about, /contact.
- Secondary indexable: /how-to-pay, /savings-calculator.
- Noindex: /auth, /payment, /privacy, /terms.

## Research Findings
- Routes are defined in `new-cmt/src/App.tsx` for English and language-prefixed paths.
- There is no existing head management library (no react-helmet).
- `public/robots.txt` exists but has no sitemap reference.
- `index.html` contains default meta tags.
- Added react-helmet-async with a centralized Seo component in this implementation batch.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Add react-helmet-async + Seo component | Centralized page metadata management |
| Add JSON-LD for Organization/Service/FAQ | Rich result eligibility |
| Add sitemap.xml + update robots.txt | Ensure crawl coverage |
| Use favicon as default OG image | Existing asset, avoids new design work |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| HelmetDispatcher init error in tests | Wrapped affected tests with HelmetProvider |

## Resources
- `new-cmt/src/App.tsx`
- `new-cmt/public/robots.txt`
- `new-cmt/index.html`
- `docs/plans/2026-01-19-new-cmt-seo-implementation-plan.md`

## Visual/Browser Findings
- N/A

---
*Update this file after every 2 view/browser/search operations*
*This prevents visual information from being lost*
