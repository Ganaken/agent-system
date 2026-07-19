# Visual, Mobile & Image-SEO Audit — mulak.app

Date: 2026-07-14
Site: https://mulak.app (307 → https://www.mulak.app/), Next.js/Vercel, bilingual EN/AR (client-toggle, no separate /ar URL)
Tooling: Playwright (chromium, installed this session) via capture_screenshot.py / analyze_visual.py / render_page.py, plus curl/PIL for raw asset inspection.

Screenshots saved to `/root/agents/seo/screenshots/`:
- `desktop.png` (1920x1080), `mobile.png` (375x812) — required deliverables
- `desktop_full/`, `mobile_full/` — full-page captures
- `www_mulak_app_laptop.png`, `www_mulak_app_tablet.png` — extra viewports
- `desktop_ar.png`, `mobile_ar.png` — RTL/Arabic toggle state
- `mobile_topright_crop.png`, `mobile_header_crop.png` — pixel-level crop evidence of header CTA clipping
- `analyze_desktop.json` / `analyze_desktop_full.json` — analyze_visual.py raw output

---

## 1. Above-the-Fold (Desktop, 1920x1080)

- H1 "Every property, one question away." — large, high-contrast (white/blue gradient) over a dimmed Dubai skyline hero image. Clearly visible, no scroll needed.
- Sub-copy clearly states the value prop (AI assistant for landlords).
- Primary CTA "Start free trial" sits in the header nav — visible above the fold on desktop.
- Unconventional but present secondary CTA pattern: an AI "Ask anything about Mulak…" search bar + 3 suggestion chips as the hero's main interactive element, instead of a classic single button.
- `analyze_visual.py` heuristic reported `cta_visible: false` — this is a **tool false negative**: its selector list looks for href/text patterns like `signup`, `contact`, `demo`, "Get Started" which don't match this site's actual copy ("Start free trial", "Contact sales", "Ask"). Manually confirmed via screenshot that a CTA is visible above the fold on desktop.
- No layout shift/overlap observed in the static capture.

## 2. Mobile Rendering (375x812)

- `viewport` meta present; `analyze_visual.py` confirms.
- No **page-level** horizontal scroll: `document.documentElement.scrollWidth` (375) == `window.innerWidth` (375).
- **Critical bug found (not caught by scrollWidth check):** the header's `nav-right` container (language toggle + "Start free trial" button) overflows the 375px viewport — `getBoundingClientRect()` shows the CTA button spans x=246.7→409.7px (34.7px beyond the 375px edge). Because the overflow is clipped (not scrollable), the button is **visually cut off** rather than reachable by scrolling. Pixel crop (`mobile_topright_crop.png`) confirms: the trailing arrow icon and right-side padding/rounded corner of "Start free trial" are sliced off at the screen edge on a standard 375px mobile viewport.
- **High:** Desktop nav links (Home/Product/Features/Pricing) are `display:none` on mobile (`.nav-center` computed style) with **no hamburger/menu replacement** — mobile users have no way to jump to sections; only the logo, language toggle, and (clipped) CTA remain in the header.
- **Medium:** Tap targets for the EN/العربية language toggle measure 43x33px and 59x33px — both under the 48x48px minimum recommended touch-target size (height is ~31% short).
- Base font size: 16px (meets the ≥16px legibility guideline); `readable: true`.
- Full-page mobile/desktop screenshots show large apparent blank gaps between sections (e.g., between the "how it works" and dashboard sections). This is most likely scroll-triggered `.reveal` fade-in animations (CSS `opacity:0` until an IntersectionObserver fires) not activating during a non-scrolling full-page capture — flagged as a **capture-tool artifact requiring manual scroll QA**, not confirmed as a real user-facing defect.

## 3. RTL / Arabic Rendering

- No dedicated `/ar` URL — `/ar` and `/ar/` both 307/308-redirect back to the EN app shell. Arabic is a **pure client-side toggle** (button labeled "العربية" in the nav), confirmed via Playwright: clicking it sets `<div class="landing-root">` to `dir="rtl" lang="ar"` (the outer `<html>` tag itself stays `lang="en"`, no `dir` attribute change detected at the document root).
- Screenshots captured for manual visual QA: `desktop_ar.png`, `mobile_ar.png`.
- **SEO/international note (adjacent, not purely visual):** because there is no separate crawlable Arabic URL/locale route and no `hreflang` alternates, Arabic content cannot be directly indexed, linked, or shared by search engines/social platforms — flagged for the SEO workstream.

## 4. Image SEO Audit

### Inventory (6 unique assets / 7 `<img>` references on the homepage)

| Asset | Dimensions | Format | Size | Alt text | Loading |
|---|---|---|---|---|---|
| /landing/dubai-skyline.webp | 1280x543 | WebP | 108.5 KB | `alt=""` (decorative; parent `aria-hidden="true"`) — correct | none (preloaded via `<link rel=preload>`, correct for LCP) |
| /landing/dashboard.png (1st use) | 1659x640 | PNG | 96.7 KB | "Mulak property dashboard showing annual rent, active units, cheques due, ROI and upcoming cheques" | none (preloaded via `<link rel=preload>`) |
| /landing/dashboard.png (2nd use) | 1659x640 | PNG | 96.7 KB | "Your whole dashboard" | `lazy` |
| /landing/chat.png | 331x440 | PNG | 27.9 KB | "Ask in plain words" | `lazy` |
| /landing/network.png | 1703x855 | PNG | **604.7 KB** | "See the connections" | `lazy` |
| /landing/calendar.png | 1743x778 | PNG | 163.2 KB | "One calm timeline" | `lazy` |
| /landing/unit.png | 3258x902 | PNG | 390.8 KB | "ROI at a glance" | `lazy` |

Total unique-asset payload: ≈1.36 MB, all served as fixed full-resolution files with no `srcset`/responsive variants (plain `<img>`, not `next/image`) — mobile devices download the same bytes as 1920px desktop.

### Findings

- **Alt text coverage: 100%** (7/7 tags have an `alt` attribute). 1 correctly empty for a decorative/aria-hidden background image; 6 descriptive. Minor polish opportunity: several alt strings just repeat the adjacent `<h3>` heading (e.g., "ROI at a glance") rather than describing what's actually depicted in the screenshot — low-priority refinement, not a gap.
- **Format modernization: poor.** Only 1/6 assets (17%) uses WebP; 0% AVIF; 83% are PNG for photographic/UI-screenshot content, where WebP/AVIF typically cut 40–70% of file size. `network.png` at 604.7 KB is the single largest offender on the page.
- **Oversized images:** `network.png` (604.7 KB @ 1703px) and `unit.png` (390.8 KB @ 3258px — an unusually wide native asset) are both far larger than their rendered container needs (feature-row media boxes use a `16:10 aspect-ratio` container that is well under 1000px wide in most layouts); no responsive `srcset` is served, so oversized delivery affects every viewport including mobile.
- **Lazy loading: correctly implemented.** 5/7 `<img>` tags carry `loading="lazy"` (all below-the-fold feature images + repeat dashboard image). The 2 near-top images (hero background, first dashboard shot) correctly skip lazy-loading and instead use `<link rel="preload" as="image">` — good LCP prioritization practice.
- **Explicit width/height (CLS): missing on all 7 `<img>` tags** (0/7 have native `width`/`height` attributes, and no `next/image` component is used). Real-world CLS risk is partially mitigated: the 4 lazy feature images sit inside `.fr-media` containers with CSS `aspect-ratio:16/10` reserved ahead of image load (confirmed in stylesheet), and hero/dashboard images sit in absolutely-positioned/fixed-shape containers (`.hero-skyline`, `.dash-frame`) whose layout doesn't depend on the image's intrinsic size. Net effect: **low-to-moderate** actual CLS risk today, but this is fragile (relies on every container always having a reserved aspect-ratio) and doesn't follow the width/height or `next/image` best practice.
- **Open Graph / Twitter Card / social preview image: CRITICAL — absent entirely.** No `og:title`, `og:description`, `og:image`, `og:url`, `twitter:card`, or `twitter:image` meta tags found in either the raw or Playwright-rendered HTML. Checked Next.js App Router's conventional dynamic routes: `GET /opengraph-image` and `GET /twitter-image` both return HTTP 200, but their body is actually the `/login` page's HTML (a generic catch-all response), confirming **no dedicated OG image asset exists**. Any share of mulak.app on X/LinkedIn/WhatsApp/Slack/iMessage will render with no image and platform-default title/description — a meaningful social-conversion gap for a SaaS marketing site.
- Adjacent (non-image) finding worth flagging to the SEO lead: `/robots.txt` and `/sitemap.xml` both return HTTP 200 with the marketing page's HTML rather than actual robots/sitemap content — no real robots.txt or sitemap.xml appears to exist.

---

## Images Score: 52 / 100

| Component (weight) | Score | Notes |
|---|---|---|
| Alt text coverage (25%) | 22/25 | 100% coverage, decorative image correctly empty; minor generic-alt reuse |
| Format modernization (25%) | 8/25 | 83% PNG, 0% AVIF, one 604.7 KB oversized PNG |
| Lazy loading (15%) | 14/15 | Correct lazy/preload split between below-fold and LCP-candidate images |
| Explicit dimensions / CLS (15%) | 9/15 | No width/height attrs, but CSS aspect-ratio containers mitigate risk |
| OG/Twitter social image (20%) | 0/20 | Completely absent; fake 200 responses on convention routes |

---

## Issues by Severity

**Critical**
1. Mobile header CTA ("Start free trial") is visually clipped ~35px off the right edge of a 375px viewport — button's icon/padding is cut off, not reachable by scroll. (`mobile_topright_crop.png`)
2. No Open Graph or Twitter Card meta tags anywhere on the site; no real OG image asset (conventional Next.js OG routes silently 200 with `/login` HTML instead of an image). Social shares will show no image/no custom title.

**High**
3. No mobile navigation (hamburger or otherwise) — `.nav-center` is `display:none` below the `md` breakpoint with nothing replacing it; mobile users cannot jump to Product/Features/Pricing sections from the header.
4. Poor image format modernization: 5 of 6 landing images are PNG (0% AVIF, only 17% WebP); `network.png` alone is 604.7 KB — all served without responsive `srcset`, so mobile downloads full desktop-resolution bytes.

**Medium**
5. No explicit `width`/`height` on any `<img>` tag (CLS best practice gap), only partially mitigated by CSS `aspect-ratio` on some containers.
6. Language-toggle tap targets (43x33px / 59x33px) are below the 48x48px recommended minimum touch target.
7. No dedicated crawlable `/ar` URL / hreflang for the Arabic experience (client-toggle only) — international-SEO gap adjacent to this audit's scope.

**Low**
8. Several image alt texts duplicate the adjacent heading rather than describing the screenshot's actual visual content (e.g., "ROI at a glance").
9. Large blank-looking gaps in full-page screenshots, likely from scroll-triggered `.reveal` animations not firing during automated capture — recommend manual scroll-through QA to confirm this isn't a real content-visibility bug.
10. `/robots.txt` and `/sitemap.xml` return the marketing page's HTML (200) instead of real robots/sitemap files (flag to SEO lead, outside visual/image scope).

---

## Raw Data

```json
// analyze_visual.py (desktop 1920x1080 + mobile 375x812 combined pass)
{
  "url": "https://www.mulak.app",
  "above_fold": {
    "h1_visible": true,
    "cta_visible": false,   // tool false-negative, see notes above
    "hero_image": "/landing/dubai-skyline.webp"
  },
  "mobile": {
    "viewport_meta": true,
    "horizontal_scroll": false,  // page-level only; header CTA still clips, see below
    "touch_targets_ok": true     // tool doesn't measure actual px; manual check found 33px-tall lang buttons
  },
  "fonts": { "base_size": 16, "readable": true },
  "error": null
}
```

```json
// Manual Playwright bounding-box check, mobile viewport 375x812
{
  "nav_center_display": "none",
  "header_cta_button_box": {"x": 246.65625, "y": 8.59375, "width": 163, "height": 40},
  "cta_right_edge_px": 409.65625,
  "viewport_width_px": 375,
  "overflow_px": 34.65625,
  "lang_button_EN_box": {"width": 43, "height": 32.8},
  "lang_button_AR_box": {"width": 59, "height": 32.8},
  "document_scrollWidth": 375,
  "window_innerWidth": 375
}
```

```json
// RTL toggle check
{"url": "https://www.mulak.app/", "landing_root_dir": "rtl", "landing_root_lang": "ar", "html_dir": null}
```

```
// Image assets (dimensions via PIL, size via curl HEAD)
dubai-skyline.webp  1280x543  WEBP  108528 bytes
dashboard.png       1659x640  PNG    96673 bytes  (used 2x)
chat.png             331x440  PNG    27888 bytes
network.png         1703x855  PNG   604764 bytes
calendar.png        1743x778  PNG   163198 bytes
unit.png            3258x902  PNG   390820 bytes
```

```
// OG/Twitter/meta probe
<title>Mulak — Property Management</title>
<meta name="description" content="Property management dashboard for Dubai portfolio"/>
og:* meta tags found: 0
twitter:* meta tags found: 0
GET /opengraph-image -> 200 (body = /login page HTML, not an image)
GET /twitter-image    -> 200 (body = /login page HTML, not an image)
GET /robots.txt        -> 200 (body = marketing page HTML)
GET /sitemap.xml       -> 200 (body = marketing page HTML)
```
