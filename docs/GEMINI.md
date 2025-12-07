# GEMINI Development Guidelines

This document outlines the development standards, workflow, and best practices for the **China Medical Tour** project.

## 1. Project Overview

- **Type**: Static Website
- **Hosting**: GitHub Pages
- **DNS/CDN**: Cloudflare (https://chinamedicaltour.org/)
- **Repository**: [https://github.com/sjiangtao2024/chinamedicaltour](https://github.com/sjiangtao2024/chinamedicaltour)
- **Primary Tech Stack**:
  - HTML5 (Semantic)
  - Tailwind CSS (CDN)
  - Vanilla JavaScript
  - Libraries: Lucide React (Icons), Chart.js

## 2. Development Environment

### Local Development
Since this is a static site without a build step, you can run it using any static file server.
- **Recommended**: VS Code "Live Server" extension.
- **Alternative**: Python HTTP server:
  ```bash
  python -m http.server 8000
  ```
- **Access**: `http://localhost:8000`

### Browser Testing
- Use **Chrome DevTools** for all UI/UX debugging.
- Ensure responsiveness on Mobile (375px), Tablet (768px), and Desktop (1280px+).

## 3. Code Standards

### HTML Structure
- Use semantic HTML tags (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`).
- Ensure all images have `alt` attributes for accessibility and SEO.
- **IDs**: Use unique, descriptive IDs for sections (e.g., `#about`, `#services`) to facilitate navigation and deep linking.

### CSS (Tailwind)
- Use Tailwind utility classes primarily.
- For repeated components (like buttons or cards), define styles in the `<style>` block using `@apply` if a build step exists, or standard CSS classes that compose Tailwind utilities if not.
- **Current State**: Styles are mixed between inline Tailwind classes and a `<style>` block in `head`.
- **Recommendation**: As the site grows, move custom CSS to `css/styles.css`.

### JavaScript
- **Naming**: Use `camelCase` for variables and functions.
- **Organization**:
  - Currently embedded in `<script>` tags.
  - **Future Goal**: Move logic to `js/app.js` or specific modules (e.g., `js/carousel.js`, `js/calculator.js`).
- **Debugging**:
  - Use `console.log()` for state tracking.
  - **Global Rules**:
    1. Formulate a hypothesis.
    2. Add `console.log` to check state.
    3. Analyze and fix.
    4. **MUST** remove `console.log` before committing.

## 4. Workflow & Deployment

### Git Flow
1. **Main Branch**: `main` (Production). Deploys automatically to GitHub Pages.
2. **Feature Development**:
   - Create a branch: `feature/name-of-feature`
   - Commit changes.
   - Test locally.
   - Push and create a Pull Request (PR).
3. **Commit Messages**:
   - Format: `type(scope): description`
   - Example: `feat(hero): add carousel auto-play`
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`.

### Deployment
- Pushing to `main` triggers GitHub Pages build.
- automated via GitHub Actions (standard Pages workflow).
- Cloudflare caches the content. **Note**: If changes don't appear immediately, you may need to purge the Cloudflare cache (if you have access) or wait for TTL.

## 5. Documentation
- **Location**: All documentation created for this project **MUST** be placed in the `docs/` directory. **Do not** place documentation files in the project root directory.
- **Gemini & AI**: Follow instructions in `GEMINI.md`.

## 6. Revamp Suggestions (Roadmap)
To modernize and scale the site, consider the following "Revamp" steps:

1.  **File Organization**:
    - Create `assets/images/`, `assets/css/`, `assets/js/`.
    - Move large logic blocks out of HTML.
2.  **Performance**:
    - Optimize images (WebP format).
    - locally host fonts if possible or preconnect (already done).
3.  **SEO**:
    - Ensure unique `meta` description and `title` for each page.
    - Add Open Graph (OG) tags for social sharing.
4.  **Maintainability**:
    - If the site becomes complex, consider a lightweight static site generator (SSG) like **Vite** or **Astro** to allow component reuse (e.g., Header/Footer) without duplicating HTML.

## 7. AI Agent Rules
- **Language**: Always answer in **Chinese** (中文).
- **Docs**: All generated documents must be saved in `docs/`. Never create documentation files in the root directory.
- **Scripts**: All generated utility scripts (e.g., python, bash) must be saved in `scripts/`. This directory is git-ignored.
- **Modularization**: Follow modularization standards. Do not create monolithic files. Split code into logical modules (e.g., separate CSS, JS, and data files).
