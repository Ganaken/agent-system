# SEO Audit — mulak.app

**Target:** https://mulak.app (canonical host resolves to `https://www.mulak.app`)
**Business type:** SaaS — Mulak is an AI property-management assistant for landlords (UAE/Dubai market, bilingual EN/Arabic, AED pricing, 14-day free trial). Legal entity per footer: *Ganaken*.
**Audit date:** 2026-07-14
**Method:** 9 specialist sub-agents run in parallel (technical, on-page, content/E-E-A-T, schema, sitemap/robots, performance, visual/image, GEO/AI-search, SXO, backlinks) over the live site. Per-category detail lives in the sibling files listed at the bottom.

---

## SEO Health Score: **39 / 100** — Poor (foundational fixes required)

| Category | Weight | Score | Weighted | Verdict |
|---|---:|---:|---:|---|
| Content Quality (E-E-A-T) | 23% | 28 | 6.44 | Weak — great prose, no trust/depth |
| Technical SEO | 22% | 42 | 9.24 | Broken crawl infra, solid HTTPS/SSR |
| On-Page SEO | 20% | 55 | 11.00 | Clean HTML, thin metadata |
| Schema / Structured Data | 10% | 8 | 0.80 | None exists |
| Performance (CWV, lab) | 10% | 55 | 5.50 | Good TTFB, overloaded critical path |
| AI Search Readiness (GEO) | 10% | 32 | 3.20 | Not citable, no corroboration |
| Images | 5% | 52 | 2.60 | Good alt, unoptimized PNGs, no OG |
| **TOTAL** | **100%** | | **38.8 → 39** | |

**Supporting diagnostics (not in the weighted score):** Sitemap/crawl-infra **8/100** · SXO experience-gap **34/100** · Backlinks **insufficient data** (Tier 0 — Common Crawl only; domain not yet in the CC index, which for a new .app is *absence of measurement*, not weak authority).

---

## Synthesis (PERCEIVE → ANALYZE → VALIDATE → ACT)

**PERCEIVE.** The homepage itself is genuinely good: server-rendered Next.js/Vercel, a premium hero ("Every property, one question away."), a clear value prop, an interactive "Ask" demo, honest pricing (AED 1000/mo), and clean, filler-free copy (prose mechanics scored 89/100). First impressions are strong. But the moment you look past the one visible page, the site is hollow — and a single infrastructure bug is doing most of the damage.

**ANALYZE — the one root cause behind most Critical findings.** The Next.js auth middleware matches a broad path pattern and 307-redirects *every* non-allowlisted path to `/login`, returning the login page's HTML with a 200 status. That one bug simultaneously breaks: `robots.txt`, `sitemap.xml`, `llms.txt`, and every "content" route the footer links to — `/privacy`, `/terms`, `/about`, `/blog`, `/security`, `/careers`, `/data-residency`, `/ar` — all of which serve **byte-identical login HTML** (md5 `0fdf3df0…`, 17,558 bytes). So three of the four biggest problems (no crawl infra, no legal/trust pages, ~10 duplicate URLs) collapse into **one fix**. This is the load-bearing insight of the audit: sequence everything behind that middleware fix.

**ANALYZE — three secondary themes.** (1) *No machine-readable/shareable layer* — zero JSON-LD, no canonical, no Open Graph/Twitter tags, and a title (27 chars) + meta description (51 chars) that omit the product's own keywords (AI, UAE, Dubai, landlord). Low effort, high impact. (2) *Trust & proof deficit* — no real legal pages, no testimonials/case studies/logos/reviews, no About/team, broken placeholder social links, and zero external corroboration (no G2/Capterra/Crunchbase/Wikipedia/Reddit/YouTube). This one deficit simultaneously tanks E-E-A-T, conversion, and AI-citation eligibility. (3) *The bilingual Arabic promise is invisible to search* — "Answers in English or Arabic" is a client-side toggle on a single URL; there is no `/ar` route, no `hreflang`, no server-rendered `dir="rtl"`. Structurally, the Arabic-speaking half of the target UAE market cannot find this product organically.

**VALIDATE.** The homepage's strengths are real and worth protecting — do not "rewrite" the copy (it scores 89/100). The failures are structural, not cosmetic: crawl infrastructure, trust pages, i18n architecture, and a metadata layer. Falsifiability checks and leading indicators are attached to each recommendation below so progress can be monitored without re-running the full audit.

**ACT.** The action plan is dependency-sequenced: fix the middleware first (it unblocks a cascade), then ship the cheap metadata layer, then rebuild i18n + trust, then grow content and authority.

---

## Critical Findings (fix immediately — foundational / trust / penalty risk)

### C1 — Auth middleware redirects public infra + content paths to `/login`
`robots.txt`, `sitemap.xml`, `llms.txt`, `/privacy`, `/terms`, `/about`, `/blog`, `/security`, `/careers`, `/data-residency`, and `/ar` all 307→`/login` and serve identical login HTML with a 200 status. No valid robots.txt or sitemap exists anywhere on the domain; ~10 URLs are duplicate soft-404s.
- **First principle (THINK):** public infrastructure and marketing content must never require auth; a 200-HTML response to a `robots.txt` request is undefined crawler behavior.
- **Dependency (CONNECT):** unblocks C2, and High items H1–H3, H6, and GEO/llms.txt. Fix this *before* anything else.
- **Falsifiability (ACCEPT):** `curl -sI https://www.mulak.app/robots.txt` returns `200 text/plain` with real directives (not a redirect to `/login`); genuinely missing paths return a true `404`.
- **Leading indicator (GROW):** GSC "Discovered – not indexed" count and duplicate-URL warnings drop; robots.txt tester in GSC reads a valid file.
- **Fix:** add an explicit allow-list to the middleware `matcher` for `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/favicon.ico`, and real public routes; return proper `404` for nonexistent paths instead of redirecting.

### C2 — No real Privacy Policy or Terms of Service pages
Footer `Privacy`/`Terms`/`Careers`/`Contact` are `mailto:hello@mulak.app` stubs; the routes serve login HTML. Only a "RERA · DLD compliant" badge exists, and only on the post-login screen.
- **THINK:** a product storing tenant PII, cheque images, and contracts in a UAE-regulated market (PDPL) must publish real legal pages — this is a trust *and* compliance requirement, not an SEO nicety.
- **CONNECT:** depends on C1; is a prerequisite for the trust recovery in H4 and for every persona's "Trust" score (avg 5.8/25 in SXO).
- **ACCEPT:** `/privacy` and `/terms` return unique, indexable, human-readable policy pages (not login HTML); footer links resolve to them.
- **GROW:** conversion rate on "Start free trial" and bounce on the pricing anchor improve once trust pages exist.

### C3 — Bilingual Arabic experience is not indexable
`/ar` → `/login`; `hreflang` empty; `<html lang="en">` hardcoded; language switch is a client-side button, not a link. Arabic search demand cannot reach the site at all. Brand-collision risk with unrelated "Mulak/Amlak" property products in the region compounds this.
- **THINK:** hreflang requires each language variant to live at its own crawlable URL — this is an architecture problem, not a meta-tag patch.
- **CONNECT:** independent of C1 (needs a routing rebuild); enables the Arabic-first persona (currently 30/100) and doubles addressable UAE demand.
- **ACCEPT:** `/ar` (or `ar.mulak.app`) returns a server-rendered page with `<html lang="ar" dir="rtl">`, translated title/H1/meta, and reciprocal `hreflang="en"|"ar"|"x-default"` tags validated in GSC's International Targeting report.
- **GROW:** Arabic-query impressions appear in GSC; Arabic pages get indexed.

---

## High Findings (fix within ~1 week — significant ranking/CTR/trust impact)

- **H1 — Zero structured data.** No JSON-LD at all. Add `Organization` (Ganaken) + `WebSite` + `SoftwareApplication`+`Offer` (AED 1000/mo, 14-day trial, UAE `areaServed`). Ready-to-paste `@graph` is in `schema.md`. *Falsify:* Rich Results Test passes with no errors. *Leading indicator:* price/product eligibility appears in GSC Enhancements.
- **H2 — No canonical tag anywhere** + apex→www uses `307` (temporary) not `301/308` + no query-param canonicalization (`?utm_source=` returns 200 uncanonicalized). Add a self-referencing canonical sitewide; make the apex redirect permanent.
- **H3 — No Open Graph / Twitter Card tags.** Shares on WhatsApp (a product feature!), LinkedIn, X render as bare URLs. `/opengraph-image` and `/twitter-image` currently return login HTML, not images. Add OG/Twitter tags + a real 1200×630 image. *Falsify:* LinkedIn Post Inspector / X Card Validator render a card.
- **H4 — Trust & proof deficit.** No testimonials, case studies, client logos, review counts, About/team bios, or press; social links are generic placeholders (`x.com/`, `linkedin.com/`, `wa.me/` with no handle). E-E-A-T composite 12/100; no external corroboration in any AI-citable source. Add ≥2–3 named UAE testimonials/case studies, an About page, real social profiles (usable as `sameAs`).
- **H5 — Title & meta description too thin and duplicated.** `Mulak — Property Management` (27 chars) / `Property management dashboard for Dubai portfolio` (51 chars) omit "AI", "UAE", "landlord"; identical on `/login`, `/signup`. Rewrite to ~55/~150 chars with the real differentiators; make them unique per page.
- **H6 — `/login` and `/signup` are indexable** (200, no `noindex`, duplicate metadata). Add `noindex,follow`; fix the broken `/forgot-password` pre-auth route.
- **H7 — No security headers** on any response (no CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`). Clickjacking/MIME-sniff exposure on `/login` for a financial-data product. HSTS present but lacks `includeSubDomains; preload`.
- **H8 — Content strategy gap.** Single 564-word page; no blog/comparison/guide content while SERPs for the core queries are ~50–70% listicle/comparison/guide (Azibo, Stessa, DoorLoop, SoftwareSuggest, coralme, almasit). AI-synthesis for "property management software UAE" cited Yardi/MRI/Buildium/AppFolio/PropSpace — **not Mulak**.
- **H9 — Mobile bugs.** Header CTA is clipped ~35px off the right edge at 375px width; there is **no mobile nav menu** (nav links just `display:none` below `md` with no replacement).

---

## Medium Findings (fix within ~1 month)

- **Performance critical-path overload:** 17 preloaded font files (~356 KB) racing the LCP hero; `dashboard.png` (96 KB) preloaded but off-screen; unoptimized PNGs (`network.png` 604 KB, `unit.png` 391 KB, `calendar.png` 163 KB); 4 third-party SDKs (HubSpot, Intercom, PostHog, Sentry) bundled into the public page (INP/hydration risk). TTFB is good (~250 ms), CLS mitigated via CSS `aspect-ratio`.
- **Images:** no explicit `width`/`height` on any `<img>` (CLS best-practice); 5/6 images are PNG (should be WebP/AVIF); no `srcset`; no `fetchpriority="high"` on the hero.
- **Local relevance:** copy never mentions Ejari, RERA, DEWA, or "UAE" in body text — the exact anchors competitors use for local trust.
- **CTA depth:** only two CTAs site-wide ("Start free trial" / "Contact sales"); no low-commitment path (demo, sample dashboard) for awareness-stage visitors.
- **GEO structure:** no `llms.txt`; H2/H3s are taglines, not question-headed answer blocks; "How it works" is `<div>`s, not a semantic `<ol>`.
- **IndexNow** not implemented (trivial on Vercel once robots/sitemap exist).
- **`app.mulak.app` does not resolve in DNS** despite being referenced in on-page UI copy — flag to owner (possible incomplete migration; consistent with the middleware state).
- **Language-toggle tap targets** are 33 px tall (< 48 px min); **no logo asset** for `Organization.logo`; HTML `Cache-Control: no-store` disqualifies bfcache; `/landing/*` images lack long-term caching.

## Low Findings (backlog)

- Footer heading-level skip (`<h4>` columns with no parent `<h3>`).
- Some image alt text just echoes the adjacent heading.
- `/pricing` returns a real 404 — no shareable/linkable pricing URL (only `#pricing` anchor).
- No speculation rules (prefetch/prerender); no inline critical CSS (both stylesheets, ~168 KB, render-block).

---

## Prioritized Action Plan (dependency-sequenced)

### Phase 0 — Unblock the foundation (this week; mostly ONE fix)
1. **Fix the middleware matcher** (C1): allow-list `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/favicon.ico`, and public routes; return true `404`s. *Everything below depends on this.*
2. Ship a real **robots.txt** (with `Sitemap:` directive + explicit AI-crawler allow list) and **sitemap.xml** (generated file in `sitemap.md`).
3. Build & publish real **Privacy Policy + Terms** pages; relink footer, remove `mailto:` stubs (C2).
4. Add `noindex,follow` to `/login`/`/signup`/`/forgot-password`; fix the `/forgot-password` route (H6).
5. Change apex→www `307` to `301/308` (H2).

### Phase 1 — Metadata layer (week 1–2; low effort, high leverage)
6. Add self-referencing **canonical** sitewide (H2).
7. Paste in **JSON-LD** — Organization + WebSite + SoftwareApplication + Offer (H1; from `schema.md`).
8. Add **Open Graph + Twitter** tags and a real 1200×630 OG image; fix `/opengraph-image` (H3).
9. Rewrite **title + meta description** with AI/UAE/Dubai/landlord keywords, unique per page (H5).
10. Add **security headers** + HSTS `includeSubDomains; preload` (H7).

### Phase 2 — i18n, trust, mobile, speed (month 1)
11. Rebuild **locale architecture**: `/en` + `/ar` server-rendered URLs, `dir="rtl"`, reciprocal `hreflang` + `x-default` (C3).
12. Add **testimonials / case studies / client logos / review counts**, an **About/team** page, and real **social profiles** (`sameAs`) (H4).
13. Fix **mobile CTA clipping + add a mobile nav menu**; enlarge toggle tap targets (H9).
14. **Optimize images** (WebP/AVIF, `srcset`, `width`/`height`), drop the off-screen preload, cut font preloads, and defer/lazy-load the third-party SDKs.

### Phase 3 — Content & authority (month 2–3; GROW)
15. Build a **content surface**: blog + a **comparison page** ("Mulak vs Keyper vs PropSpace"), UAE-regulatory content (Ejari/RERA/DEWA), and question-headed answer blocks + a curated **llms.txt** for GEO.
16. Pursue **listings & links**: G2, Capterra, Crunchbase, Dubai Chamber, MAGNiTT/Wamda, and regional PropTech press (Arabian Business, Gulf Business) — this is the single biggest lever for both backlinks and AI-citation corroboration.
17. Implement **IndexNow**; re-run Common Crawl backlink check after the next quarterly release.

---

## Leading Indicators to Monitor (no re-audit needed)
- **GSC** (once verified): robots.txt reads valid; sitemap "Success"; duplicate/soft-404 count → 0; Arabic-query impressions appear; SoftwareApplication/price enhancements detected.
- **Social validators** render OG cards for `mulak.app`.
- **Rich Results Test** passes with no errors.
- **Brand search:** "Mulak property management Dubai" begins surfacing third-party sources (G2/Crunchbase/press), not just mulak.app.
- **AI Overviews / ChatGPT / Perplexity** begin naming Mulak for "AI property manager UAE / landlord app Dubai" long-tail queries.

## Limitations
- **No Google API credentials** configured → no PageSpeed/Lighthouse lab scores, no CrUX field data, no GSC/GA4 data. Performance is a **lab-based heuristic estimate**; CWV field verdicts are unavailable. To enable: `python3 scripts/google_auth.py --auth`.
- **Backlinks at Tier 0** (Common Crawl + verify only) — no DA/PA. Add a free Moz API key for real referring-domain metrics.
- **Competitor/SERP analysis** used live WebSearch sampling, not a certified rank tracker — directional, location/personalization-sensitive.
- **In-app / post-login product** experience was out of scope (marketing site only).
- `app.mulak.app` (named in the request) does not resolve; the marketing site and app both live on `www.mulak.app`.

## Per-category reports (full detail)
`technical.md` · `content.md` · `schema.md` · `sitemap.md` · `performance.md` · `visual.md` (+ `screenshots/`) · `geo.md` · `sxo.md` · `backlinks.md` — all in `/root/agents/seo/`.
