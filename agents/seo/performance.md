# Performance / Core Web Vitals Audit — mulak.app

**Date:** 2026-07-14
**Method:** Lab-based static/heuristic analysis (curl, HTTP headers, HTML/CSS/JS inspection, screenshot). **No field data (CrUX) and no Lighthouse/PSI run were available** — see Tooling Notes below. All findings are inferred from resource inspection, not a real browser trace, so treat LCP/INP/CLS numbers as estimates, not measured values.

## Tooling Notes (what worked / didn't)

| Tool | Result |
|---|---|
| `pagespeed_check.py` | Failed both mobile/desktop: `"PSI rate limit exceeded (240 QPM / 25,000 QPD)"` — no Google API key configured (`get_api_key()` returns `None`), so PSI request went out unauthenticated and was rejected. No Lighthouse lab scores or CrUX field data obtainable. |
| `lcp_subparts.py` | Failed: `"Error: Google API key not configured."` (requires CrUX API access, not available). |
| `preload_check.py` | Ran successfully. Score: **25/100**. |
| `render_page.py --mode auto --json` | Ran successfully, `mode_used: "raw"` (page is not an SPA shell — server-rendered Next.js HTML with full content present, `is_spa: false`). |
| `fetch_page.py` | CLI doesn't support `--json`; used `curl` directly instead for full header/body capture. |
| `capture_screenshot.py` | Ran successfully; confirms hero layout and LCP candidate visually. |

Because PSI/CrUX/Lighthouse were unavailable, this report is built from direct resource measurement (curl timing, `Link` header preloads, downloaded asset sizes, CSS/JS inspection) rather than a synthesized Lighthouse score.

## Site / Stack Facts

- Next.js (App Router, React Server Components — `Vary: rsc, next-router-state-tree...`), hosted on Vercel (`fra1::iad1` edge).
- `https://mulak.app` issues a **307 redirect** to `https://www.mulak.app/` — extra round trip before any content loads.
- HTML delivered with Brotli compression: 49,333 bytes raw → **10,206 bytes transferred** (br).
- `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` on the HTML document — disqualifies the page from **back/forward cache (bfcache)**, forcing a full reload on back-navigation.
- DOM size: ~540 elements (well under the 1,500-element risk threshold).
- No inline `<style>` blocks (no critical-CSS inlining); render depends on 2 external stylesheets.

## TTFB (3 runs, apex bypassed, hitting `www` directly)

| Run | TTFB | Total |
|---|---|---|
| 1 | 248ms | 251ms |
| 2 | 238ms | 332ms |
| 3 | 274ms | 365ms |

TTFB itself (~240-275ms) is reasonable (PSI "good" threshold ≤800ms), but real-world users typing the bare `mulak.app` domain incur an **additional 307 redirect round-trip** before this TTFB clock even starts.

## Resource Inventory & Weight

### Render-blocking CSS (2 stylesheets, no critical CSS inlining)
| File | Size |
|---|---|
| 15.3qq-ervj4e.css | 106,423 bytes |
| 062e0d8bgj05c.css | 61,549 bytes |
| **Total** | **167,972 bytes** decompressed |

### JavaScript (16 chunks referenced in initial HTML)
| File | Bytes |
|---|---|
| 10d~v~sj-0316.js | 227,651 |
| 047um4ze_3oh0.js | 329,730 |
| 0.2_ychj4fl0e.js | 239,079 |
| 0ou6w1f_9x-c3.js | 143,878 |
| 16ksa~32zaksw.js | 136,911 |
| 03~yq9q893hmn.js | 112,594 |
| 0i.l9589uvx0j.js | 54,763 |
| 0jnk4zvznhnv1.js | 56,380 |
| 04.i-__.as.dk.js | 44,022 |
| 0.mno-ug-rdrm.js | 34,280 |
| 091k9_0fuc69-.js | 31,932 |
| 0.243_fu2axnz.js | 27,073 |
| turbopack-0umt8lopyoys2.js | 11,053 |
| 01238z8uin57_.js | 10,476 |
| 0hpnrek~99o9g.js | 5,372 (preloaded `fetchPriority="low"`) |
| 10qosu7yh9z8w.js | 2,116 |
| **Total decompressed** | **1,467,310 bytes (1.4 MB)** |
| **Total gzip/br transfer (measured)** | **~457,349 bytes (447 KB)** |

Grepping the largest chunk (`047um4ze_3oh0.js`, 329KB) for known SDK identifiers found: **hubspot, intercom, posthog, sentry** — four third-party SDKs bundled into a single 329KB/108KB(transfer) chunk shipped on the public marketing page.

### Fonts — 17 separate woff2 files, all preloaded via HTTP `Link` header (high priority)
Total: **364,572 bytes (356 KB)**, individual files ranging 8.7KB–40KB. Font families in use (from `<html class>`): Geist, Geist Mono, DM Sans, DM Mono — 4 families × multiple weight cuts = 17 preloaded files, all fighting for bandwidth priority alongside the hero image and CSS. `font-display: swap` is correctly set (avoids FOIT) but 104 `@font-face` rules exist across the two stylesheets.

### Images
| File | Format | Size | Loading | Above/below fold |
|---|---|---|---|---|
| dubai-skyline.webp | WebP | 108,528 B | preloaded, no `loading` attr | **Above fold — likely LCP element** (full-viewport hero background, confirmed via screenshot) |
| dashboard.png | PNG | 96,673 B | preloaded, no `loading` attr | **Not visible in first viewport** (screenshot) — preload appears wasted, competes with real LCP resource |
| chat.png | PNG | 27,888 B | `loading="lazy"` | below fold |
| network.png | PNG | **604,764 B** | `loading="lazy"` | below fold |
| calendar.png | PNG | 163,198 B | `loading="lazy"` | below fold |
| unit.png | PNG | 390,820 B | `loading="lazy"` | below fold |
| dashboard.png (2nd use) | PNG | 96,673 B (cached, same URL) | `loading="lazy"` | below fold |

None of the 7 `<img>` tags carry explicit `width`/`height` attributes or `fetchpriority`. However, CSS inspection shows `.shot` and related containers use `aspect-ratio: 16/10`, `width:100%;height:100%`, `object-fit:cover`, and `position:absolute;inset:0` patterns — i.e., dimensions are reserved via parent container aspect-ratio rather than img attributes. This is a valid CLS-mitigation technique **if consistently applied**, but could not be 100% confirmed without a real rendered layout trace (no Lighthouse available).

Image cache headers: `Cache-Control: public, max-age=0, must-revalidate` on `/landing/*` images — **no long-lived caching**, unlike the JS/CSS chunks which correctly use `public, max-age=31536000, immutable`. Every repeat visit must revalidate 96KB–605KB images.

### Estimated Full Page Weight
- Critical path (before/around LCP paint): HTML (~10KB br) + CSS (~168KB raw, ~50KB est. gz) + 17 fonts (365KB, preloaded, no further compression benefit) + hero webp (108KB) + wastefully-preloaded dashboard.png (96KB) ≈ **~730KB+ contending for bandwidth in the critical rendering path**
- JS payload: 1.47MB decompressed / ~447KB transferred
- Below-fold PNGs (lazy): ~1.28MB (chat+network+calendar+unit+dup dashboard)
- **Total full-page transfer estimate: ~2.2–2.4MB** — driven largely by unoptimized PNG screenshots that should be WebP/AVIF.

## Core Web Vitals Assessment (Lab/Heuristic — No Field Data)

### LCP — Estimated "Needs Improvement" (not measured directly)
LCP element is almost certainly `dubai-skyline.webp` (full-viewport hero background, confirmed visually). It is already in WebP format and preloaded, which is good. However:
- The apex→www 307 redirect adds a round trip before the TTFB clock even starts.
- The hero image must compete for high-priority bandwidth against **365KB of preloaded fonts** and a **wastefully preloaded 96KB image (dashboard.png)** that isn't even visible above the fold, plus 168KB of render-blocking CSS.
- Under simulated throttled-mobile conditions (the standard Lighthouse mobile test profile, ~1.6Mbps), this combined ~730KB of concurrently-prioritized critical-path bytes would take multiple seconds to clear, which would likely push LCP past the 2.5s "good" threshold on mobile even though desktop/broadband LCP is probably fine.
- No `fetchpriority="high"` is set explicitly on the hero `<img>` (relies on implicit preload priority only — `preload_check.py` flagged `preload_lcp_candidate: false`).

### CLS — Estimated "Good" (tentative)
- No inline dimension attributes on `<img>` tags, but CSS shows `aspect-ratio` / absolute-position container patterns for hero/screenshot media, which — if applied consistently across all image slots — should prevent layout shift. `font-display: swap` is set (avoids invisible text, though FOUT is still possible for headline text that may reflow when the web font swaps in vs. fallback).
- Could not be fully confirmed without a real rendered/traced layout (no Lighthouse CLS score available).

### INP — Estimated "Good to Needs Improvement" (not measured directly)
- DOM size (540 elements) is well under the 1,500-element risk threshold — low structural risk.
- However, 1.47MB decompressed / ~447KB transferred JS includes bundled **HubSpot, Intercom, PostHog, and Sentry** SDKs in a single 329KB chunk — third-party scripts are a documented common INP culprit (main-thread hijacking during hydration/init), especially on lower-end mobile devices. This raises risk of long tasks during initial hydration, which could delay input responsiveness (particularly first interactions right after load).

## Findings by Priority

### Critical
1. **17 separate font files (356KB) preloaded at high priority, all racing the LCP hero image for bandwidth.** Combined with a wastefully-preloaded, off-screen `dashboard.png` (96KB) and 168KB of render-blocking CSS, the critical rendering path carries ~730KB of high-priority bytes before LCP can paint — the single biggest lab-identified LCP risk.
2. **Four third-party SDKs (HubSpot, Intercom, PostHog, Sentry) bundled into the public marketing page's JS**, contributing to a 329KB/108KB(gz) chunk and to the 1.47MB total JS payload — known INP risk (main-thread work during load/hydration) on a page that has minimal interactive surface.

### High
3. **`dashboard.png` (96KB) is preloaded via `<link rel=preload as=image>` but is not visible in the first viewport** (confirmed via screenshot) — this preload actively competes with the true LCP resource for early bandwidth and should be removed or deferred.
4. **Unoptimized below-the-fold screenshots in PNG**: `network.png` (604,764 bytes), `unit.png` (390,820 bytes), `calendar.png` (163,198 bytes) — should be converted to WebP/AVIF, which for photographic/UI screenshots typically yields 60-80% size reduction (e.g., network.png could plausibly drop from ~590KB to ~100-150KB).
5. **Apex domain `mulak.app` 307-redirects to `www.mulak.app`** — adds a full extra round trip before TTFB for any user/bot/link that doesn't already use the `www` form.

### Medium
6. **`Cache-Control: no-store` on the HTML document** disqualifies the page from bfcache, forcing full re-renders on back/forward navigation (noted by `preload_check.py`, score 25/100).
7. **Image assets under `/landing/` use `max-age=0, must-revalidate`** instead of long-lived immutable caching (unlike JS/CSS chunks, which correctly use `public, max-age=31536000, immutable`) — repeat visitors re-fetch/revalidate multi-hundred-KB images unnecessarily.
8. **No explicit `fetchpriority="high"` on the LCP hero image** — relies on implicit preload priority only.
9. **No `<script type="speculationrules">`** for prefetch/prerender of likely next navigations (Product/Features/Pricing) — flagged by `preload_check.py`.

### Low
10. 104 `@font-face` declarations across two stylesheets for 4 font families × multiple weights — consider subsetting/reducing weight variants if not all are used, to shrink the font preload set further.
11. No inline critical CSS — both stylesheets (168KB decompressed) are fully render-blocking; inlining above-the-fold critical CSS could shave some render delay.

## Recommendations (Prioritized by Expected Impact)

1. **Trim font preloading** (Critical → biggest expected LCP win): Preload only the 1-2 font files actually needed for the above-the-fold hero text (headline + body). Load remaining weights/families via normal `<link rel=stylesheet>` (non-blocking, non-preloaded) or `font-display: swap` without preload. Expect meaningful LCP improvement on mobile/throttled conditions since ~300KB+ of contention would be removed from the critical path.
2. **Remove or defer the `dashboard.png` preload** since it isn't shown above the fold — frees ~96KB of high-priority bandwidth for the real LCP resource. Add `fetchpriority="high"` explicitly to the hero `dubai-skyline.webp` instead.
3. **Convert below-fold PNG screenshots to WebP/AVIF** with `srcset` sizing — targets ~1MB+ reduction in total page weight (network.png/unit.png/calendar.png are the biggest offenders).
4. **Move the apex domain redirect to the edge/DNS level** (or serve identical content on both `mulak.app` and `www.mulak.app` without a redirect) to eliminate the extra round trip for non-`www` entry.
5. **Audit and lazy-load/defer third-party SDKs** (HubSpot, Intercom, PostHog, Sentry): load Intercom/HubSpot chat widgets after first interaction or via `requestIdleCallback`, and confirm Sentry/PostHog initialization isn't blocking hydration — reduces INP risk from main-thread contention.
6. **Set long-lived immutable caching on `/landing/*` static images** to match the JS/CSS caching policy, improving repeat-visit performance.
7. **Remove `Cache-Control: no-store`** from the marketing page response (scope no-store to authenticated app routes only) to re-enable bfcache for back/forward navigation.
8. **Add speculation rules** (`<script type="speculationrules">`) to prefetch/prerender top nav destinations (Product, Features, Pricing).

## Performance Score

**Estimated Performance Score: 55/100** (lab-based heuristic estimate; not a measured Lighthouse score — PSI/Lighthouse/CrUX were unavailable, see Tooling Notes)

Justification: TTFB is good (~250ms) and DOM size is low-risk, but the critical rendering path is overloaded with ~730KB of high-priority-contending bytes (17 preloaded fonts + a wastefully preloaded off-screen image + render-blocking CSS) that would likely push mobile LCP into "Needs Improvement" territory under standard throttled test conditions. Total page weight (~2.2-2.4MB, driven by unoptimized PNG screenshots) and third-party SDK bundling (HubSpot/Intercom/PostHog/Sentry in a shared JS chunk) add further downward pressure on the composite score, while CLS risk appears comparatively well-managed via CSS aspect-ratio containers and font-display:swap is correctly configured.
