# SEO Optimization Plan

## Goal Description
Optimize the website for search engines by ensuring all pages have proper Titles, Meta Descriptions, Open Graph tags, and Canonical links. Update the sitemap to include all key pages.

## User Review Required
None. These are standard SEO best practices.

## Proposed Changes

### Sitemap
#### [MODIFY] [sitemap.xml](file:///c:/dev_code/chinamedicaltour/sitemap.xml)
- Add `packages.html`
- Add `stories.html`
- Adjust priorities

### HTML Pages

#### [MODIFY] [packages.html](file:///c:/dev_code/chinamedicaltour/packages.html)
- Update `<title>`
- Add `<meta name="description">`
- Update Open Graph and Twitter tags
- Add `<link rel="canonical">`

#### [MODIFY] [stories.html](file:///c:/dev_code/chinamedicaltour/stories.html)
- Update `<title>`
- Add `<meta name="description">`
- Update Open Graph and Twitter tags
- Add `<link rel="canonical">`

#### [MODIFY] [index.html](file:///c:/dev_code/chinamedicaltour/index.html)
- Add `<link rel="canonical">`

#### [MODIFY] [culture-planner.html](file:///c:/dev_code/chinamedicaltour/culture-planner.html)
- Add `<link rel="canonical">`

## Verification Plan

### Automated Tests
- Inspect the modified files to ensure tags are correctly placed in the `<head>`.
- Verify `sitemap.xml` structure is valid XML.

### Manual Verification
- Open pages in browser (if possible) or visually verify code.
- Ensure no broken tags.
