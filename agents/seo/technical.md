# Technical & On-Page SEO Audit — mulak.app

Audit date: 2026-07-14
Scope: https://mulak.app (canonical host resolves to https://www.mulak.app), bilingual EN/Arabic SaaS marketing site for an AI property-management assistant (UAE market). Companion app referenced as app.mulak.app.

Tools used: `render_page.py` (Playwright-aware fetch), `fetch_page.py`, direct `curl` header/redirect probing, `openssl s_client` for TLS/SAN inspection, manual HTML parsing of the fetched source.

---

## 0. Executive summary of what the site actually is

`mulak.app` is a **single marketing page** (an animated one-pager with in-page anchors `#dashboard`, `#features`, `#how`, `#pricing`) served by Next.js/Vercel, sitting in front of an authenticated app shell that lives on **the same domain** (`/login`, `/signup`, `/forgot-password`). There is no evidence the marketing site has multiple crawlable content pages — everything that isn't the literal homepage or `/login`/`/signup` either 404s or 307-redirects into the login screen (see 1.2). This significantly changes the shape of the audit: most "index bloat" risk is moot (there's almost nothing to index beyond one URL), but crawlability of essential crawler files (`robots.txt`, `sitemap.xml`) is broken, and the bilingual Arabic experience is not URL-addressable at all.

---

## 1. Crawlability

### 1.1 robots.txt — FAIL (Critical)
`GET https://mulak.app/robots.txt` → `307` → `https://www.mulak.app/robots.txt` → `307` → `Location: /login` → final `200` on `/login` (an authenticated login-page shell), `Content-Type: text/html`.

There is **no static `robots.txt` file** at all. Any crawler (or human) requesting `/robots.txt` is served the marketing app's login page HTML with a 200 status. This is reproducible with a Googlebot UA string as well (tested), so it is not UA-conditional — it will affect real Googlebot/Bingbot crawls identically.

Practical impact:
- Search engines that request robots.txt and get a 200 HTML response will treat that response *as the robots.txt file content* — since it contains no valid robots directives, the effective policy is "no rules found" (functionally equivalent to allow-all), but this is fragile/undefined behavior and some crawlers may misinterpret a non-timeout, non-4xx/5xx HTML 200 as authoritative.
- No way to specify sitemap location, crawl-delay, or disallow rules for `/login`, `/signup`, `/forgot-password` (auth pages — should typically be disallowed from crawl and/or noindexed).
- No AI-crawler tokens/directives at all (no `GPTBot`, `Google-Extended`, `PerplexityBot`, `CCBot` rules) — for a company likely wanting AI-search visibility, this is a missed opportunity for explicit allow/disallow policy.

### 1.2 Sitemap — FAIL (Critical)
`GET /sitemap.xml`, `/sitemap_index.xml`, `/sitemap-0.xml` all reproduce the exact same behavior as robots.txt: 307 → `/login` → 200 HTML. **No XML sitemap exists.** For a single-page site this has low direct ranking impact today, but it removes the standard discovery/indexing-status signal channel to GSC/Bing Webmaster Tools, and blocks any future page-count growth from being cleanly indexed.

### 1.3 Middleware catch-all swallows unknown/legal/blog paths — HIGH
Path probing (`curl`, reproducible across repeated runs and both default and Googlebot UAs):

| Path | Status | Notes |
|---|---|---|
| `/` | 200 | homepage (real content) |
| `/login`, `/signup` | 200 | real app routes |
| `/pricing`, `/features`, `/contact` | 404 (`x-matched-path: /404`) | genuinely unmatched Next.js routes |
| `/about`, `/blog`, `/privacy`, `/terms`, `/ar`, any random slug (`/zzzzz-random-2`) | **307 → `/login`** (200 HTML) | intercepted by auth middleware |

So there are two different "not found" behaviors on the same domain: a proper Next.js 404 for some slugs, and a silent redirect-to-login for others (including plausible legal/localization paths like `/privacy`, `/terms`, `/ar`). Any crawler or backlink pointing at those paths gets soft-404'd into the login screen with a 200 status — a **soft 404** that can dilute indexation signals and confuses link equity consolidation. Recommend an explicit, consistent 404 (or true redirect with 301) for all non-existent public paths, and exclude `robots.txt`/`sitemap.xml` from the auth middleware matcher.

### 1.4 No blocked resources observed
CSS/JS/font/image assets under `/_next/static/...` and `/landing/...` returned 200 directly and are not gated by the login middleware, so rendering assets are crawlable. No evidence of blocked CSS/JS that would break rendering.

**Crawlability verdict: FAIL** — robots.txt and sitemap.xml are both non-functional (redirected into the app), which is a hard blocker for clean technical SEO regardless of content quality.

---

## 2. Indexability

- **Meta robots**: none present on the homepage (no `<meta name="robots">` tag found) → defaults to `index, follow`. Fine for the homepage; but note there is no way to verify equivalent behavior on `/login`/`/signup` — those authenticated-shell pages currently have **no noindex** either, meaning `/login` and `/signup` (server-rendered, 200, full HTML head with title "Mulak — Property Management" and description "Property management dashboard for Dubai portfolio" — identical to homepage metadata) are indexable and duplicate the homepage's title/description. **Recommend adding `noindex` to `/login`, `/signup`, `/forgot-password`.**
- **Canonical tag: MISSING.** No `<link rel="canonical">` was found anywhere in the homepage `<head>`. Combined with the domain having both `mulak.app` and `www.mulak.app` reachable (redirecting to www), and a marketing site fronting `/login`/`/signup` with duplicate title+description, the lack of a self-referencing canonical on the homepage is a real gap — nothing is telling search engines that `https://www.mulak.app/` is the one true URL to consolidate signals on.
- **Duplicate content / thin content risk**: `/login` and `/signup` currently ship the exact same `<title>` and `<meta description>` as the homepage ("Mulak — Property Management" / "Property management dashboard for Dubai portfolio"), which is a duplicate-metadata issue if those pages get indexed (see above — they aren't noindexed).
- **Index bloat**: not currently a risk — there is effectively one indexable content page. This will need re-evaluation once the site grows beyond the single-page marketing structure.

**Indexability verdict: FAIL** (missing canonical, no noindex on auth pages, duplicate metadata risk).

---

## 3. Security

- **HTTPS**: enforced. HTTP→HTTPS is a `308 Permanent Redirect` (correct, permanent). TLS certs are valid Let's Encrypt certs, correctly scoped per-hostname (`mulak.app` cert has SAN `mulak.app` only; `www.mulak.app` cert has SAN `www.mulak.app` only — Vercel serves per-host certs via SNI, both valid, both within their Jul–Oct 2026 validity windows). No mixed-content: all asset references in the fetched HTML use root-relative paths or `https://` (fonts.googleapis.com, fonts.gstatic.com).
- **HSTS**: present — `Strict-Transport-Security: max-age=63072000` (2 years). No `includeSubDomains` or `preload` directive. Given `app.mulak.app` is meant to be a subdomain carrying auth/session data, adding `includeSubDomains` (and submitting to the HSTS preload list) would meaningfully harden the whole property. **Currently missing `includeSubDomains; preload`.**
- **Other security headers — all missing** on every response checked (homepage, login, signup): no `Content-Security-Policy`, no `X-Content-Type-Options`, no `X-Frame-Options` / `frame-ancestors`, no `Referrer-Policy`, no `Permissions-Policy`. For a product handling tenant financial data (rent, cheques, RERA/DLD-referenced compliance claims) and login forms, the absence of `X-Frame-Options`/CSP frame-ancestors is a clickjacking exposure on `/login`, and the absence of `X-Content-Type-Options: nosniff` is a MIME-sniffing exposure. This is not a Google-ranking signal directly, but it is a standard item in technical/trust audits and matters for a UAE-regulated proptech brand.
- **No `X-Robots-Tag` header** on any response (not inherently bad, just noting no server-level indexing directive exists as a backstop).

**Security verdict: PARTIAL PASS** — HTTPS/TLS/HSTS fundamentals solid; hardening headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) are entirely absent.

---

## 4. URL Structure

- **Canonical host inconsistency / temporary redirect**: `https://mulak.app/` → `307 Temporary Redirect` → `https://www.mulak.app/`. Using a `307` for a *permanent* domain-canonicalization redirect is a technical-SEO anti-pattern — 307 signals "temporary" to crawlers/browsers, so it won't be cached and doesn't pass the same unambiguous permanence signal as a 301/308. The HTTP→HTTPS hop correctly uses `308`, but the non-www→www hop should also be `301`/`308`, not `307`. **Recommend changing apex→www redirect to 301 (or 308).**
- **Trailing slash handling**: `https://www.mulak.app//` → `308 → /` (correct, permanent, normalizes to no double-slash). `/login/` → `308 → /login` (correct). So true static-route trailing-slash normalization is done properly (308) — inconsistent with the 307 used for the www redirect, which is a mixed signal.
- **Query strings**: `/?utm_source=test` returns `200` directly with no redirect/canonical to strip the query — combined with the missing canonical tag (§2), tracking-parameter URL variants have no consolidation signal at all. **Recommend adding a self-referencing canonical** so `?utm_source=...`, `?ref=...` etc. all canonicalize to `https://www.mulak.app/`.
- **URL slugs**: clean, no file extensions, no session IDs, lowercase (`/login`, `/signup`, `/forgot-password`) — good where they exist.
- **Case sensitivity**: `/LOGIN` returns `307` (into the same middleware redirect-to-login behavior as an unknown path) rather than a canonical redirect to lowercase `/login` — minor, low-traffic-impact but technically another soft-404-via-redirect case.

**URL structure verdict: PARTIAL PASS** — clean slugs and correct HTTPS enforcement, but non-www→www uses the wrong redirect type (307) and there is no canonical safety net for query-parameter variants.

---

## 5. Mobile-Friendliness

- Viewport meta present and correct: `<meta name="viewport" content="width=device-width, initial-scale=1">` — no `maximum-scale`/`user-scalable=no` lockout (good for accessibility/zoom).
- Markup uses Tailwind responsive utility classes extensively (`md:hidden`, `md:inline`, etc.), indicating a responsive (not adaptive/separate-mobile-URL) design — consistent with modern mobile-friendly practice, single URL serves all devices (no `m.mulak.app` fragmentation).
- Nav/CTA buttons use generous padding classes (e.g., `px-5 py-2`) suggesting reasonable tap-target sizing; full tap-target audit requires rendered/visual inspection (deferred to the visual/performance agent) but nothing in the source raises a red flag.
- No separate mobile template, no viewport-dependent content hiding that would create parity issues for mobile Googlebot (mobile-first indexing) — content in raw HTML is device-independent.

**Mobile verdict: PASS** (based on source-level signals; recommend the visual-QA agent confirm tap-target sizing and real-device rendering).

---

## 6. Core Web Vitals — lab-level hints from source only (full measurement owned by performance agent)

Observations relevant to LCP/CLS/INP risk, from HTML/response inspection only:

- **LCP candidate images ARE preloaded**: `<link rel="preload" as="image" href="/landing/dubai-skyline.webp">` and `.../dashboard.png` — good practice, should help LCP.
- **Not using `next/image`**: all `<img>` tags are plain `<img src=...>` with no `srcset`/`sizes`, and **no explicit `width`/`height` attributes** on any of the 7 images found (`dubai-skyline.webp`, `dashboard.png` ×2, `chat.png`, `network.png`, `calendar.png`, `unit.png`). Without explicit dimensions (or a CSS `aspect-ratio`, which cannot be confirmed from HTML alone), the browser cannot reserve layout space before the image downloads — a common **CLS** contributor. This also forfeits Next.js's automatic responsive-image/format-negotiation (AVIF/WebP) benefits and blocks proper `fetchpriority`/lazy-loading tuning beyond the basic `loading="lazy"` already applied to below-the-fold shots (that part is good).
- **Font loading**: 16+ individual `woff2` files are preloaded via the `Link` response header (`rel=preload; as=font`) for what appears to be 4 font families (Geist, Geist Mono, DM Sans, DM Mono) plus IBM Plex Sans Arabic pulled at runtime from Google Fonts CDN (`fonts.googleapis.com`/`fonts.gstatic.com`, not self-hosted). This is a large number of blocking font preloads for a single page and an external (Google Fonts) round-trip for at least one family — both can delay first paint / contribute to LCP risk. Self-hosting all fonts and reducing the preloaded weight/style count would reduce render-blocking risk.
- **No JSON-LD structured data** to trigger additional CWV cost, but also nothing to give rich-result eligibility (see §7).
- **INP**: cannot be measured from static source; note the floating "Open AI chat" button uses drag/grab interaction (`cursor-grab`) which is exactly the kind of custom-interaction widget worth profiling for INP in the field (main-thread work during drag).

**CWV verdict: NEEDS IMPROVEMENT (lab-hint only)** — LCP images preloaded is a plus, but missing width/height on all images (CLS risk) and heavy font-preload count (LCP/render-blocking risk) should be flagged to the performance/visual agents for measurement.

---

## 7. Structured Data (brief — schema agent owns depth)

**Zero JSON-LD blocks found** (`application/ld+json` count = 0) on the homepage. No `Organization`, `SoftwareApplication`, `Product`, `FAQPage`, `BreadcrumbList`, or `WebSite`/`SearchAction` schema present. For a SaaS product with pricing tiers visibly rendered in-page ("Individual", plan cards, "14 days free") this is a missed opportunity for `SoftwareApplication`/`Offer` schema and potentially `FAQPage` if FAQ content exists below the fold. Flagging for the schema sub-agent to do a full recommendation; from a technical-presence standpoint this is a clear gap.

---

## 8. JavaScript Rendering

- **Server-side rendered**: confirmed. `render_page.py --mode auto` did **not** trigger Playwright rendering (`is_spa: false`, `mode_used: "raw"`) — the raw HTTP response already contains full page copy. Manual tag-stripped extraction of the raw HTML confirms all marketing copy is present without JS execution: hero copy ("Every property, one question away." / "Mulak is an AI assistant for landlords..."), all 8 feature blocks, pricing section headers, and footer are all in the initial server response (Next.js App Router RSC streaming).
- This means Googlebot/Bingbot do not need to execute JS to see the homepage's core content — a strong positive for crawlability/indexability of the content that does exist.
- **Caveat**: the Arabic-language variant of this content is **not** server-rendered at a distinct URL — it is a client-side toggle (see §9/hreflang below), so while the *English* content is fully SSR'd and crawlable, the Arabic content is effectively invisible to crawlers regardless of the site's good SSR posture for English.
- `/login` and `/signup` are similarly server-rendered (also confirmed via raw fetch), consistent Next.js App Router behavior across routes.

**JS rendering verdict: PASS** for the English homepage content; **FAIL** for Arabic content discoverability (a rendering-adjacent but really an internationalization architecture problem — see next section).

---

## 9. IndexNow Protocol

- No IndexNow key file found: checked `/.well-known/indexnow` and `/indexnow.txt` (common conventions) — both return the same `307 → /login` middleware behavior as any unknown path (no evidence of a valid key file at any guessed location).
- No sitemap exists to submit via IndexNow-adjacent workflows in the first place.
- No evidence in the shipped JS bundle names or headers of Bing Webmaster Tools verification or IndexNow integration.

**IndexNow verdict: FAIL / NOT IMPLEMENTED.** Recommend implementing IndexNow (trivial to add given the site is on Vercel/Next.js) once robots.txt/sitemap are fixed, so Bing/Yandex/Naver get instant-push notification for the (currently single, soon hopefully more) indexable URL(s).

---

## 10. On-Page SEO

### 10.1 Title tag
`Mulak — Property Management` — 27 characters. **Too short** relative to the ~50–60 char budget, and it under-sells the product: it doesn't mention "AI", "assistant", "Dubai/UAE", or a differentiator, despite the body copy being keyword-rich ("AI assistant for landlords", "AI-powered", "Natural-language AI" appear multiple times). Also identical on `/login` and `/signup` (duplicate title issue, §2).
**Recommendation**: something like `Mulak — AI Property Management Assistant for UAE Landlords` (within ~60 chars), and unique titles for `/login` ("Sign in — Mulak") and `/signup` ("Start free — Mulak") if those remain indexable, or noindex them (preferred, see §2).

### 10.2 Meta description
`Property management dashboard for Dubai portfolio` — 51 characters. Far under the ~150–160 char budget, no call-to-action, no mention of AI/WhatsApp reminders/bilingual support — all differentiators visible in the actual page copy but absent from the description search engines will show in the SERP snippet. Identical across `/`, `/login`, `/signup` (duplicate).
**Recommendation**: rewrite to ~150 chars incorporating "AI", "landlords", "UAE/Dubai", "WhatsApp reminders", "English & Arabic", with a CTA.

### 10.3 Heading hierarchy
- Single `<h1>`: `"Every property, one question away."` — correct, one H1, on-brand, present in raw SSR HTML (confirmed via regex extraction of the `reveal`-class wrapper).
- Logical H2s follow ("Every unit, cheque and contract — in one calm view.", "See the connections", "Eight ways it keeps your portfolio in focus.", "Simple plans...", "Bring your portfolio into focus.") with H3 subsections nested under the "eight ways" H2 (Ask in plain words / Reminders on WhatsApp / Monthly reports / etc.) — structurally sound, no heading-level skips from H1→H2→H3 in the main content flow.
- **Minor issue**: footer navigation columns use `<h4>Product</h4>`, `<h4>Company</h4>`, `<h4>Legal</h4>` with no intervening H3/section H2 — a heading-level skip (H2/H3 → H4 without a parent H3) in the footer. Low impact (footer nav, not content), but worth normalizing to `<h3>` or using a non-heading element (e.g., a labelled `<div>`/`nav aria-label`) for footer column labels, which is the more common accessible pattern anyway.

### 10.4 Canonical tag
Missing entirely (see §2) — flagged as Critical/High under both Indexability and On-Page.

### 10.5 Open Graph / Twitter Card tags
**None present.** Zero `og:*` or `twitter:*` meta tags found anywhere in the homepage `<head>`. This means any share of `mulak.app` on LinkedIn, X/Twitter, WhatsApp (notable given the product itself markets WhatsApp reminders as a feature), or Slack will render with no title/description/image card — just a bare URL or platform-guessed fallback. **High-impact, low-effort fix**: add `og:title`, `og:description`, `og:image` (1200×630), `og:url`, `og:type=website`, `og:locale` (+`og:locale:alternate` for Arabic), and `twitter:card=summary_large_image`.

### 10.6 Internal linking
The entire nav and footer link structure is same-page anchors (`#dashboard`, `#features`, `#how`, `#pricing`) or `mailto:`/external social links — there are **no internal links to other indexable pages** because, per §1.3, no other public pages exist. Footer "Privacy" and "Terms" links point to `mailto:hello@mulak.app` rather than actual legal pages — for a product explicitly claiming "RERA · DLD compliant" in its UI chrome, shipping Privacy/Terms as email requests rather than published policy pages is both an SEO gap (no crawlable trust content) and a credibility/compliance-optics concern worth flagging to the content/legal owner. "About Ganaken", "Careers", "Blog" footer links are all anchors or mailto — none resolve to real content.

### 10.7 Image alt attributes
7 `<img>` tags found, 6 carry descriptive, non-keyword-stuffed alt text (e.g., `"Mulak property dashboard showing annual rent, active units, cheques due, ROI and upcoming cheques"`, `"Ask in plain words"`, `"See the connections"`); 1 decorative hero background image (`dubai-skyline.webp`) correctly uses `alt=""` (appropriate for decorative images per WCAG). **Alt coverage: 7/7 appropriately handled — pass.**

### On-Page score inputs summary
Strong: single well-formed H1, logical heading flow in main content, complete and appropriate alt-text coverage, keyword-rich visible body copy, SSR'd content.
Weak: no canonical, no OG/Twitter tags, thin/generic title & meta description that don't reflect the product's actual differentiators, no real internal link graph beyond anchors, legal pages routed to mailto instead of real URLs, minor heading-level skip in footer.

---

## 11. Bilingual EN/Arabic (hreflang) — flagged per brief, full validation deferred to `seo-hreflang` sub-skill

This is one of the most consequential findings of the audit given the product's explicit bilingual UAE positioning:

- **No hreflang tags of any kind** in the homepage `<head>` — no `<link rel="alternate" hreflang="en" ...>`, no `hreflang="ar"`, no `hreflang="x-default"`.
- **No separate Arabic URL exists.** `/ar` was tested and falls into the same middleware 307→`/login` behavior as any nonexistent path (§1.3) — it is not a valid route.
- The language switcher visible in the markup (`<div class="lang" role="group" aria-label="Language"><button ...>EN</button><button ...>العربية</button></div>`) is implemented as a **pair of `<button>` elements with no `href`**, i.e., a client-side state toggle, not navigation to a distinct, crawlable URL. This means:
  - Search engines cannot discover, crawl, or independently rank the Arabic version of the page **at all** — there is no URL to request.
  - `hreflang` is structurally impossible to implement correctly in the current architecture, because hreflang requires each language variant to live at its own URL that the tag can point to.
  - `lang="en"` is hardcoded on the `<html>` element even though the page contains Arabic UI strings/labels within the same DOM (e.g., "مُلاك", "العربية") — when/if the Arabic toggle is active, the document's `lang` attribute is unlikely to update correctly for a client-only text swap, which is also an accessibility (screen-reader pronunciation) issue, not just an SEO one.
- **Recommendation** (implementation detail): migrate to URL-segmented locales, e.g. `/en/...` and `/ar/...` (or `mulak.app` vs. `ar.mulak.app`), each server-rendering its own `<html lang="ar" dir="rtl">`/`<html lang="en" dir="ltr">`, with reciprocal `<link rel="alternate" hreflang="en" href=".../en/">`, `hreflang="ar"`, and `hreflang="x-default"` pointing at the English (or a neutral) version. This is a structural rebuild, not a meta-tag patch — flagging as **Critical** given it currently means the Arabic-speaking half of the target UAE market has zero organic-search discoverability for the Arabic experience.

---

## 12. Miscellaneous / architecture notes worth flagging upstream

- **`app.mulak.app` does not resolve in DNS** (`NXDOMAIN` at audit time), even though the brief states "the app lives at app.mulak.app," and the dashboard screenshot on the homepage shows a UI chrome label `app.mulak.app/dashboard`. In practice, the working authenticated routes (`/login`, `/signup`, `/forgot-password`) live on `www.mulak.app` itself. This is either (a) a DNS/infra gap where the intended subdomain hasn't been provisioned yet, or (b) a stale piece of UI copy referencing a domain structure that was changed. Either way it's worth a one-line check with the site owner — it doesn't directly affect SEO of the marketing domain, but it is a discrepancy between stated architecture and observed behavior that could indicate an incomplete migration (which would explain the robots.txt/sitemap/middleware issues in §1 — consistent with an app-shell-first Next.js deployment that hasn't yet had its public marketing routes/crawler files finished).
- Company identity in footer: `© 2026 Ganaken` — the legal/parent entity name differs from the product brand "Mulak" with zero on-page explanation of the relationship; worth an `Organization` schema entry (§7) to disambiguate brand vs. legal entity for search engines and knowledge-panel eligibility.

---

## Findings Table (raw)

| # | Category | Finding | Severity |
|---|---|---|---|
| 1 | Crawlability | robots.txt returns 307→/login HTML instead of a valid text/plain robots.txt | Critical |
| 2 | Crawlability | sitemap.xml (and common variants) return 307→/login HTML; no sitemap exists | Critical |
| 3 | Crawlability | Auth middleware soft-404s arbitrary/legal/locale paths (`/privacy`,`/terms`,`/ar`,random slugs) into `/login` with 200 status | High |
| 4 | Indexability | No canonical tag anywhere on the homepage | High |
| 5 | Indexability | `/login`,`/signup` are indexable (no noindex) and duplicate homepage title/description | Medium |
| 6 | Security | No CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy on any response | High |
| 7 | Security | HSTS present but missing `includeSubDomains`/`preload` | Low |
| 8 | URL Structure | Apex→www redirect uses 307 (temporary) instead of 301/308 (permanent) | Medium |
| 9 | URL Structure | No canonical/redirect handling for tracking-parameter URL variants (`?utm_source=...`) | Low |
| 10 | Mobile | Viewport meta correct, responsive classes present, no zoom lockout | Pass |
| 11 | CWV (lab hint) | All `<img>` tags lack width/height attributes (CLS risk); plain `<img>` not `next/image` | Medium |
| 12 | CWV (lab hint) | 16+ individual font files preloaded, IBM Plex Sans Arabic loaded from Google Fonts CDN (render-blocking risk) | Medium |
| 13 | Structured Data | Zero JSON-LD on homepage (no Organization/SoftwareApplication/Offer schema) | Medium |
| 14 | JS Rendering | Homepage English content fully SSR'd and crawlable without JS execution | Pass |
| 15 | IndexNow | Not implemented; no key file found at conventional locations | Medium |
| 16 | On-Page | Title tag (27 chars) omits core keywords (AI, UAE/Dubai, assistant) | High |
| 17 | On-Page | Meta description (51 chars) far under budget, no CTA, omits differentiators | High |
| 18 | On-Page | No Open Graph or Twitter Card tags at all | High |
| 19 | On-Page | Footer "Privacy"/"Terms" links point to `mailto:` instead of real legal pages | Medium |
| 20 | On-Page | Footer heading hierarchy skip (H4 columns with no parent H3) | Low |
| 21 | On-Page | Image alt coverage 7/7 appropriate (incl. correct empty alt on decorative image) | Pass |
| 22 | Hreflang/i18n | No hreflang tags; Arabic version has no distinct URL (client-side button toggle only); `lang="en"` hardcoded | Critical |
| 23 | Architecture | `app.mulak.app` does not resolve in DNS despite being referenced in UI copy | High (flag to owner) |

---

## Scores

**Technical SEO score: 42 / 100**
Driven down primarily by: robots.txt/sitemap.xml both non-functional (each independently near-disqualifying for a clean technical audit), no canonical tag, no hreflang/no crawlable Arabic URL for a bilingual product, missing security headers, and IndexNow not implemented. Offset by: solid HTTPS/TLS/HSTS fundamentals, fully SSR'd English content (no JS-rendering dependency), clean URL slugs, correct mobile viewport.

**On-Page SEO score: 55 / 100**
Driven down by: no canonical, no OG/Twitter cards, under-optimized title and meta description that don't reflect the product's real value props, legal pages routed to mailto rather than real URLs, zero structured data. Offset by: single well-formed H1 with logical heading flow in the main content, complete and correctly-applied alt text, keyword-rich body copy, no duplicate/thin-content sprawl (because there's only one real page).

---

## Top 5 issues (ranked)

1. **[Critical]** robots.txt and sitemap.xml both resolve to a redirected login-page HTML response instead of valid crawler files — this is a foundational crawlability failure that should be fixed before any other SEO work (exclude `/robots.txt` and `/sitemap.xml` from the auth middleware matcher; serve a real `robots.txt` with a `Sitemap:` directive and a real XML sitemap).
2. **[Critical]** No hreflang implementation and no distinct, crawlable URL for the Arabic experience (language switch is a client-side button, not a link) — for a bilingual EN/Arabic UAE product this means the Arabic-speaking market segment is fully invisible to organic search. Requires a URL-segmented locale architecture (`/en/`, `/ar/` or subdomain), not a meta-tag patch.
3. **[High]** No canonical tag anywhere on the homepage, combined with a 307 (not 301/308) apex→www redirect and no query-parameter canonicalization — signal consolidation for the domain's single indexable URL is currently unprotected.
4. **[High]** No Open Graph or Twitter Card tags, and title/meta description are far under length budget and omit the product's actual differentiators (AI, UAE/Dubai, WhatsApp reminders, bilingual support) — directly suppresses SERP/social click-through for the one page that exists.
5. **[High]** No security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) on any response, including `/login` — a trust/hardening gap notable for a product handling tenant financial data and marketing RERA/DLD compliance.

---

## Files referenced
- Raw homepage HTML captured to `/tmp/mulak_raw.html` (local scratch copy used for this audit; not part of deliverables)
- Report: `/root/agents/seo/technical.md` (this file)
