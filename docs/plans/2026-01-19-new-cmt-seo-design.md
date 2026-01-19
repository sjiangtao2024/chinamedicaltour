# New-CMT SEO Optimization Design (EN)

Date: 2026-01-19
Owner: ai-a (web)
Scope: new-cmt (English primary)

## Goals
- Improve rankings for service-intent keywords in English (medical tourism China + service categories).
- Build a content flywheel via supporting pages and internal linking.
- Establish clean technical SEO foundations (metadata, sitemap, robots, structured data).

## Constraints
- Preserve existing visual design and layout.
- Focus on English market first; ensure design can scale to multi-language later.
- No major content rewrite for non-essential pages.

## Page Scope
### Indexable (primary)
- `/` (home)
- `/health-screening`
- `/specialized-care`
- `/tcm-wellness`
- `/concierge-services`
- `/stories`
- `/about`
- `/contact`

### Indexable (secondary)
- `/how-to-pay`
- `/savings-calculator`

### Noindex
- `/auth`
- `/payment`
- `/privacy`
- `/terms`

## Architecture
### Head Management
- Centralized SEO helper (e.g., `Seo` component or helper) to set:
  - `title`
  - `meta description`
  - `canonical`
  - `og:*` and `twitter:*` tags
  - `robots` (index/noindex)
- Canonical base: `https://chinamedicaltour.org`.

### Structured Data
- Organization schema on core pages (home/about/contact).
- Service or MedicalBusiness schema on service pages.
- FAQ schema (3–5 Q&A) on each service page.

### Sitemap & Robots
- Generate `sitemap.xml` for primary and secondary pages.
- `robots.txt` allowing crawl, with sitemap reference.
- Optional: exclude noindex paths from sitemap.

## Content & Keyword Strategy
### Core Service Pages (Primary)
- Each service page targets a unique service-intent keyword set:
  - Health screening: "health screening in China", "executive checkup China"
  - Specialized care: "specialist treatment packages China", "medical tourism surgeries"
  - TCM wellness: "TCM wellness programs", "traditional Chinese medicine tourism"
  - Concierge services: "medical concierge China", "medical travel assistance"

### Supporting Pages (Secondary)
- `/how-to-pay` targets payment/search intent ("how to pay", "medical tourism payment").
- `/savings-calculator` targets cost comparison intent ("medical tourism cost", "healthcare savings").

### Trust & Authority
- `/stories` reinforces social proof and experience.
- `/about` and `/contact` reinforce entity signals and reliability.

## Internal Linking
- Home page links to each primary service page.
- Each service page links to Contact and How-to-Pay/Savings Calculator.
- Stories page links to relevant service pages.

## Performance & UX (Low-Risk)
- Ensure image `loading="lazy"` where possible.
- Add `preload` for critical hero imagery (if stable).
- Avoid layout changes or heavy UI refactors.

## Success Criteria
- Correct SEO tags and structured data per page.
- Sitemap and robots available and valid.
- Clear internal linking between services and conversion paths.
- No regressions in layout or navigation.

## Testing & Validation
- Manual check: view page source for tags.
- Run structured data testing for key pages.
- Confirm sitemap/robots endpoints accessible.
- Spot-check core pages in Lighthouse for SEO basics.
