# New-CMT SEO Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add robust, per-page SEO metadata, structured data, sitemap/robots, and noindex rules for non-ranking pages in new-cmt.

**Architecture:** Introduce a reusable `Seo` component using `react-helmet-async`, backed by a centralized `pageSeo` config. Pages consume this config and emit JSON-LD where required. Static sitemap/robots live in `public/`.

**Tech Stack:** React 18, Vite, React Router, Vitest, Testing Library, `react-helmet-async`.

---

### Task 1: Add head management dependency + provider

**Files:**
- Modify: `new-cmt/package.json`
- Modify: `new-cmt/src/main.tsx`

**Step 1: Add dependency**

```json
"dependencies": {
  "react-helmet-async": "^2.0.5",
  ...
}
```

**Step 2: Add HelmetProvider**

```tsx
import { HelmetProvider } from "react-helmet-async";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
```

**Step 3: Commit**

```bash
git add new-cmt/package.json new-cmt/src/main.tsx
git commit -m "feat(seo): add helmet provider"
```

---

### Task 2: Create Seo component + unit tests (TDD)

**Files:**
- Create: `new-cmt/src/components/seo/Seo.tsx`
- Create: `new-cmt/src/__tests__/seo.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import Seo from "../components/seo/Seo";

const renderSeo = (ui: React.ReactNode) =>
  render(<HelmetProvider>{ui}</HelmetProvider>);

afterEach(() => {
  document.head.innerHTML = "";
  document.title = "";
});

test("sets title, description, canonical, and robots", async () => {
  renderSeo(
    <Seo
      title="Test Title"
      description="Test description"
      canonical="https://chinamedicaltour.org/test"
      noindex
    />
  );

  await waitFor(() => expect(document.title).toBe("Test Title"));
  expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
    "Test description"
  );
  expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
    "https://chinamedicaltour.org/test"
  );
  expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe(
    "noindex, nofollow"
  );
});

test("renders JSON-LD", async () => {
  renderSeo(
    <Seo
      title="Schema"
      description="Schema"
      canonical="https://chinamedicaltour.org/schema"
      jsonLd={[{ "@context": "https://schema.org", "@type": "Organization", name: "CMT" }]}
    />
  );

  await waitFor(() => {
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/__tests__/seo.test.tsx`
Expected: FAIL (Seo component missing)

**Step 3: Write minimal implementation**

```tsx
import { Helmet } from "react-helmet-async";

type SeoProps = {
  title: string;
  description: string;
  canonical: string;
  noindex?: boolean;
  ogImage?: string;
  jsonLd?: Array<Record<string, unknown>>;
};

const Seo = ({ title, description, canonical, noindex, ogImage, jsonLd }: SeoProps) => {
  const robots = noindex ? "noindex, nofollow" : "index, follow";
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {ogImage ? <meta name="twitter:image" content={ogImage} /> : null}
      {jsonLd?.map((data, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
};

export default Seo;
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/__tests__/seo.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add new-cmt/src/components/seo/Seo.tsx new-cmt/src/__tests__/seo.test.tsx
git commit -m "feat(seo): add Seo component"
```

---

### Task 3: Add SEO config + schema helpers (TDD)

**Files:**
- Create: `new-cmt/src/lib/seo.ts`
- Create: `new-cmt/src/__tests__/seoConfig.test.tsx`

**Step 1: Write the failing test**

```tsx
import { pageSeo, buildCanonical } from "../lib/seo";

test("buildCanonical joins base and path", () => {
  expect(buildCanonical("/health-screening")).toBe(
    "https://chinamedicaltour.org/health-screening"
  );
});

test("noindex pages are flagged", () => {
  expect(pageSeo.terms.noindex).toBe(true);
  expect(pageSeo.payment.noindex).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/__tests__/seoConfig.test.tsx`
Expected: FAIL (seo config missing)

**Step 3: Write minimal implementation**

```ts
const SITE_BASE = "https://chinamedicaltour.org";
const DEFAULT_OG = `${SITE_BASE}/favicon.png`;

export const buildCanonical = (path: string) => `${SITE_BASE}${path}`;

export const pageSeo = {
  home: {
    path: "/",
    title: "Medical Tourism in China | China Medical Tour",
    description:
      "World-class healthcare in China with no wait times and up to 80% savings. Health screening, TCM wellness, specialized care, and concierge services.",
  },
  healthScreening: {
    path: "/health-screening",
    title: "Health Screening in China | Executive Checkups",
    description:
      "Comprehensive health screening in China with same-day results at top Grade 3A hospitals. Premium executive checkups with major savings.",
    faq: [
      {
        question: "How long does a full health screening take?",
        answer: "Most comprehensive checkups are completed within a single morning, with same-day results available.",
      },
    ],
  },
  // ...repeat for other pages
  terms: {
    path: "/terms",
    title: "Terms of Service | China Medical Tour",
    description: "Terms of Service for China Medical Tour.",
    noindex: true,
  },
  payment: {
    path: "/payment",
    title: "Payment | China Medical Tour",
    description: "Secure payment portal.",
    noindex: true,
  },
} as const;

export const defaultOgImage = DEFAULT_OG;
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/__tests__/seoConfig.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add new-cmt/src/lib/seo.ts new-cmt/src/__tests__/seoConfig.test.tsx
git commit -m "feat(seo): add seo config"
```

---

### Task 4: Wire SEO into pages (TDD)

**Files:**
- Modify: `new-cmt/src/pages/Index.tsx`
- Modify: `new-cmt/src/pages/HealthScreening.tsx`
- Modify: `new-cmt/src/pages/SpecializedCare.tsx`
- Modify: `new-cmt/src/pages/TCMWellness.tsx`
- Modify: `new-cmt/src/pages/ConciergeServices.tsx`
- Modify: `new-cmt/src/pages/Stories.tsx`
- Modify: `new-cmt/src/pages/About.tsx`
- Modify: `new-cmt/src/pages/Contact.tsx`
- Modify: `new-cmt/src/pages/HowToPay.tsx`
- Modify: `new-cmt/src/pages/SavingsCalculator.tsx`
- Modify: `new-cmt/src/pages/Auth.tsx`
- Modify: `new-cmt/src/pages/Payment.tsx`
- Modify: `new-cmt/src/pages/Privacy.tsx`
- Modify: `new-cmt/src/pages/Terms.tsx`

**Step 1: Write the failing test**

```tsx
import { render } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import Terms from "../pages/Terms";

const renderPage = (ui: React.ReactNode) =>
  render(<HelmetProvider>{ui}</HelmetProvider>);

test("terms page is noindex", async () => {
  renderPage(<Terms />);
  const robots = document.querySelector('meta[name="robots"]')?.getAttribute("content");
  expect(robots).toBe("noindex, nofollow");
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/__tests__/seoPages.test.tsx`
Expected: FAIL (no robots meta)

**Step 3: Implement SEO wiring**

```tsx
import Seo from "@/components/seo/Seo";
import { pageSeo, buildCanonical, defaultOgImage } from "@/lib/seo";

const seo = pageSeo.terms;

return (
  <>
    <Seo
      title={seo.title}
      description={seo.description}
      canonical={buildCanonical(seo.path)}
      noindex={seo.noindex}
      ogImage={defaultOgImage}
    />
    {/* existing page content */}
  </>
);
```

For service pages, pass JSON-LD (Organization + Service + FAQ):

```tsx
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "China Medical Tour",
    url: "https://chinamedicaltour.org",
    logo: "https://chinamedicaltour.org/favicon.png",
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: seo.title,
    provider: { "@type": "Organization", name: "China Medical Tour" },
    areaServed: "Global",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: seo.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  },
];
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/__tests__/seoPages.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add new-cmt/src/pages
# plus any updated seo tests

git commit -m "feat(seo): wire metadata into pages"
```

---

### Task 5: Add sitemap.xml + update robots.txt

**Files:**
- Create: `new-cmt/public/sitemap.xml`
- Modify: `new-cmt/public/robots.txt`

**Step 1: Add sitemap.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://chinamedicaltour.org/</loc></url>
  <url><loc>https://chinamedicaltour.org/health-screening</loc></url>
  <url><loc>https://chinamedicaltour.org/specialized-care</loc></url>
  <url><loc>https://chinamedicaltour.org/tcm-wellness</loc></url>
  <url><loc>https://chinamedicaltour.org/concierge-services</loc></url>
  <url><loc>https://chinamedicaltour.org/stories</loc></url>
  <url><loc>https://chinamedicaltour.org/about</loc></url>
  <url><loc>https://chinamedicaltour.org/contact</loc></url>
  <url><loc>https://chinamedicaltour.org/how-to-pay</loc></url>
  <url><loc>https://chinamedicaltour.org/savings-calculator</loc></url>
</urlset>
```

**Step 2: Update robots.txt**

```
User-agent: *
Allow: /
Disallow: /auth
Disallow: /payment
Disallow: /privacy
Disallow: /terms

Sitemap: https://chinamedicaltour.org/sitemap.xml
```

**Step 3: Commit**

```bash
git add new-cmt/public/robots.txt new-cmt/public/sitemap.xml
git commit -m "feat(seo): add sitemap and robots rules"
```

---

### Task 6: Run full test suite

**Step 1: Run tests**

Run: `npm test -- --run`
Expected: PASS (may show existing act() warning)

**Step 2: Log results**
- Update `progress.md` with test output summary.

**Step 3: Commit (if needed)**

```bash
git status --short
```

---

## Verification Checklist
- Page source shows correct `title`, `description`, `canonical`, and `robots`.
- JSON-LD appears on service pages.
- `/robots.txt` and `/sitemap.xml` accessible.
- Noindex pages show `noindex, nofollow` meta tag.
