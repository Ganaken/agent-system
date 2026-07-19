# Sitemap & robots.txt Audit — mulak.app
Date: 2026-07-14
Auditor: Sitemap Architecture specialist (automated)

## 0. Scope note — architecture reality check

The brief describes mulak.app as "a small SaaS marketing site" with the app hosted at
`app.mulak.app`. Live testing shows this is **not the actual architecture**:

- `app.mulak.app` **does not resolve in DNS** (no A/CNAME record — `dig` returns nothing,
  `curl` fails with "Could not resolve host").
- The apex `mulak.app` 307-redirects to `www.mulak.app`, which serves **both** the
  marketing landing page (`/`) and the authenticated product (`/login`, `/signup`,
  `/dashboard`, etc.) from the same Next.js/Vercel deployment.
- The "marketing site" is a **single-page landing page** with in-page anchors
  (`#features`, `#how`, `#pricing`, `#dashboard`) rather than discrete crawlable
  routes. There are no `/pricing`, `/features`, `/about`, `/blog`, `/faq`, `/docs`,
  `/contact` etc. pages — some of these paths return a real Next.js 404
  (`/pricing`, `/features`, `/contact`), while others (`/about`, `/blog`, `/faq`,
  `/integrations`, `/api`, `/docs`, `/help`, `/support`, `/careers`,
  `/forgot-password`) are caught by app middleware and 307-redirected to `/login`.

This materially changes the sitemap task: there is effectively **one** indexable
marketing URL (`https://www.mulak.app/`), plus two auth-utility pages (`/login`,
`/signup`) that are live, 200, un-noindexed, and indistinguishable from the homepage
by title/meta description.

## 1. Sitemap location check

| Location checked | Result |
|---|---|
| `https://mulak.app/sitemap.xml` | 307 → `www.mulak.app/sitemap.xml` → 307 → `/login` (200 HTML login page) |
| `https://mulak.app/sitemap_index.xml` | Same redirect chain → `/login` |
| `https://www.mulak.app/sitemap.xml` | 307 → `/login` (content-type `text/plain`, but body is the login page, not XML) |
| `robots.txt` `Sitemap:` directive | N/A — no robots.txt exists (see below) |
| Guessed alt. names (`sitemap1.xml`, `wp-sitemap.xml`, `sitemapindex.xml`, `sitemap.xml.gz`, `sitemap/sitemap.xml`) | All 307 → `/login`, none are real sitemaps |

**Finding: No sitemap.xml exists anywhere on the domain.** Every request for a
sitemap path is intercepted by the app's auth middleware and redirected to the
login screen instead of returning XML (or a real 404). Content-Type on the
redirect response is `text/plain`, which could mislead simple crawlers into
thinking a text sitemap/robots file was returned, when it's actually a redirect
with no body content.

## 2. robots.txt check

| Check | Result | Severity |
|---|---|---|
| `https://mulak.app/robots.txt` reachable | No — 307 → `www.mulak.app/robots.txt` → 307 → `/login` | **Critical** |
| `https://www.mulak.app/robots.txt` reachable | No — 307 → `/login` directly | **Critical** |
| Valid robots.txt syntax served | No — no robots.txt file exists at all | **Critical** |
| `Sitemap:` directive present | No (can't have one; file doesn't exist) | High |
| Googlebot behavior on missing/redirected robots.txt | Google follows redirects on robots.txt up to 5 hops; landing on an HTML login page is not valid robots.txt syntax, so Google will treat this as "no robots.txt found" and crawl the site unrestricted by default — but this is undefined/fragile behavior, not a deliberate policy | High |

**Root cause:** the Next.js/Vercel middleware that gates the authenticated app
appears to match on a broad path pattern (everything except a short allow-list:
`/`, `/login`, `/signup`, static assets) and redirects **any** unmatched path —
including `/robots.txt` and `/sitemap.xml`, which must never require auth — to
`/login`. This is a **build/deploy configuration bug**, not a content problem.

## 3. Format / structure validation

Not applicable — there is no sitemap XML to validate (no file, no XML body,
no `<urlset>`, no malformed tags to report). This itself is the finding:
**0/6 structural checks pass** because there is nothing to check.

| Check | Status |
|---|---|
| Valid XML declaration + `<urlset>` | Fail — no file |
| ≤50,000 URLs / file (needs sitemap index above that) | N/A (0 URLs) |
| `<lastmod>` present & accurate | N/A |
| `priority` / `changefreq` present (deprecated, informational only) | N/A |
| Non-200 URLs listed | N/A |
| Redirected/noindexed URLs listed | N/A |

## 4. Coverage vs. actual site (crawl comparison)

Pages discovered by direct probing of `www.mulak.app`:

| URL | Status | Indexable? | Notes |
|---|---|---|---|
| `/` | 200 | Yes | Landing page. Single-page site with `#features`, `#how`, `#pricing`, `#dashboard` anchors. Title: "Mulak — Property Management". Meta description: "Property management dashboard for Dubai portfolio". |
| `/login` | 200 | Yes (no noindex set) — but should not be | Same title/description as homepage (duplicate meta). No unique content. Auth utility page. |
| `/signup` | 200 | Yes (no noindex set) | Same title/description as homepage (duplicate meta). Could be a legitimate conversion landing page if given unique copy. |
| `/forgot-password` | 307 → `/login` | No — broken | Linked from the login form (`<a href="/forgot-password">Forgot password?</a>`) but the route itself redirects to `/login` for unauthenticated GET — likely a middleware bug, not intentional gating, since it's a pre-auth flow. |
| `/dashboard`, `/properties`, `/api/*` | 307 → `/login` | No | Correctly gated app-internal routes — fine to exclude. |
| `/pricing`, `/features`, `/contact`, `/about`, `/blog`, `/faq`, `/integrations`, `/docs`, `/help`, `/support`, `/careers` | 404 or 307→login | No | None of these exist as real pages; they are just anchor-scroll targets on `/` (`#features`, `#pricing`) or unused route names. |
| `/ar`, `/en`, `/ar/pricing` | 307 → `/login` | No | **No locale-prefixed URL structure exists.** The bilingual EN/عربية toggle is a client-side UI switch (footer shows "EN · العربية" as a toggle control), not separate crawlable URLs. |

**Missing from sitemap (because sitemap doesn't exist):** `/` (the only real
marketing page) — Critical gap.

**Extra/junk pages that a naive crawl might pick up:** `/login`, `/signup` are
live, 200, unauthenticated-accessible, and untagged — a generic sitemap generator
or crawler could add them to an index; they add duplicate-title noise and should
be excluded from any sitemap and ideally noindexed.

**Bilingual / hreflang assessment:** Because Arabic content is rendered
client-side under the same URL (`/`) rather than at a dedicated path like `/ar`,
there are **no alternate-language URLs to declare via hreflang in a sitemap**.
This is itself a content/architecture gap worth flagging to the site owner:
without unique URLs per language, Arabic content is invisible to Google as a
distinct indexable variant, and no `xhtml:link rel="alternate" hreflang="ar"`
annotations can be added until the URL structure changes (e.g., `/` for EN,
`/ar` for Arabic, with reciprocal hreflang tags). Recorded as a Medium
finding — out of scope to fix in the sitemap itself, but the sitemap cannot
carry hreflang alternates that don't exist as real URLs.

## 5. Quality gates (location pages)

Not triggered — 0 location/programmatic pages exist on this domain. No
warning or hard-stop applies.

## 6. Generated sitemap.xml

Given the current real architecture (one indexable marketing URL), the
correct sitemap is minimal. `/login` and `/signup` are intentionally excluded
(utility/auth pages, duplicate metadata, no unique content value). Canonical
host used is `https://www.mulak.app/` since apex `mulak.app` redirects there.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.mulak.app/</loc>
    <lastmod>2026-07-14</lastmod>
  </url>
</urlset>
```

Notes on the generated file:
- `lastmod` set to audit date as a placeholder — replace with the actual last
  content-deploy date (e.g., from git/CI) once available; do not leave a static
  date that never changes on future redeploys (Low-severity "fake lastmod"
  anti-pattern to avoid).
- No `priority`/`changefreq` included — both are ignored by Google; omitted
  by design.
- If `/signup` is developed into a real, uniquely-titled conversion page, it
  can be added as a second `<url>` entry.
- **This sitemap is not deployable as-is** until the middleware bug in Section
  2 is fixed — right now, publishing this file at `/sitemap.xml` will just be
  redirected to `/login` like every other attempt, per Section 1.

## 7. Recommended robots.txt (once middleware bug is fixed)

```
User-agent: *
Allow: /
Disallow: /login
Disallow: /signup
Disallow: /forgot-password
Disallow: /dashboard
Disallow: /api/

Sitemap: https://www.mulak.app/sitemap.xml
```

Prefer pairing `Disallow: /login` / `/signup` with `<meta name="robots"
content="noindex,follow">` on those pages rather than relying on Disallow
alone — Disallow only blocks crawling, and a URL that's already linked
(the homepage links to both) can still surface in search results as a
bare URL with no snippet if it's never crawled but is discovered via links.
noindex is the correct tool to keep them out of the index; Disallow is
optional/secondary here.

## 8. Issues summary

| # | Issue | Severity |
|---|---|---|
| 1 | No robots.txt exists; the path is redirected (307) to `/login` by app middleware instead of returning a valid robots.txt | Critical |
| 2 | No sitemap.xml exists; same redirect-to-login behavior on every sitemap path/alias tried | Critical |
| 3 | Root cause: auth middleware matcher does not exclude public infrastructure paths (`/robots.txt`, `/sitemap.xml`, likely also `/favicon.ico` variants and other static/public paths) | Critical |
| 4 | `app.mulak.app` (the subdomain the brief assumes hosts "the app") does not resolve in DNS at all — the actual product lives on `www.mulak.app`, mixed in with the marketing homepage | High |
| 5 | `/login` and `/signup` are indexable (200, no noindex, no canonical) with duplicate title/meta description identical to the homepage | High |
| 6 | `/forgot-password` is linked from the login form but itself redirects unauthenticated users to `/login` — broken pre-auth flow, also means it can never be crawled/indexed even as a support page | Medium |
| 7 | Apex→www and robots.txt/sitemap.xml redirects use 307 (temporary) rather than 301/308 (permanent) for what appear to be permanent host-canonicalization rules | Medium |
| 8 | No locale-specific URLs for Arabic content (client-side language toggle only) — no hreflang alternates possible until that changes | Medium |
| 9 | All real pages share one generic title/meta description ("Mulak — Property Management" / "Property management dashboard for Dubai portfolio") | Medium |
| 10 | Only 1 legitimate marketing URL exists on the whole domain — no supporting content (pricing, features, about, blog, docs) despite anchor links suggesting sections exist | Low (business/content scope, not a sitemap defect per se) |

## Raw data

```
DNS:
  mulak.app          A     216.198.79.1
  www.mulak.app      CNAME 24523062f9e6ae55d.vercel-dns-017.com
  app.mulak.app       NXDOMAIN / no record

Redirect chains observed:
  GET https://mulak.app/                 -> 307 https://www.mulak.app/           -> 200
  GET https://mulak.app/robots.txt       -> 307 https://www.mulak.app/robots.txt -> 307 /login -> 200 (login HTML)
  GET https://mulak.app/sitemap.xml      -> 307 https://www.mulak.app/sitemap.xml-> 307 /login -> 200 (login HTML)
  GET https://mulak.app/sitemap_index.xml-> 307 https://www.mulak.app/sitemap_index.xml -> 307 /login -> 200 (login HTML)
  GET https://www.mulak.app/robots.txt   -> 307 /login
  GET https://www.mulak.app/sitemap.xml  -> 307 /login

Path probe matrix (www.mulak.app):
  /                200
  /login           200
  /signup          200
  /favicon.ico     200
  /forgot-password 307 -> /login
  /terms           307 -> /login
  /privacy         307 -> /login
  /dashboard       307 -> /login
  /properties      307 -> /login
  /api/health      307 -> /login
  /about           307 -> /login
  /blog            307 -> /login
  /faq             307 -> /login
  /integrations    307 -> /login
  /api             307 -> /login
  /docs            307 -> /login
  /help            307 -> /login
  /support         307 -> /login
  /careers         307 -> /login
  /pricing         404
  /features        404
  /contact         404

Server: Vercel (x-vercel-id headers present on all responses)
Framework: Next.js (x-powered-by: Next.js, App Router w/ RSC payload observed)
Content-Type on redirected robots.txt/sitemap.xml: text/plain (misleading — body is actually empty/redirect, not text sitemap content)
No X-Robots-Tag header observed on any response.
No <meta name="robots"> tag observed on /, /login, or /signup.
No canonical <link> tag observed on any page.
```

## Structured findings (for audit-data.json — Sitemap category)

```json
{
  "category": "Sitemap",
  "score": 8,
  "findings": [
    {"id": "sitemap-missing", "severity": "Critical", "title": "No sitemap.xml exists", "detail": "All sitemap paths/aliases redirect (307) to /login instead of returning XML."},
    {"id": "robots-missing", "severity": "Critical", "title": "No robots.txt exists", "detail": "robots.txt path redirects (307) to /login; no valid robots.txt served at apex or www."},
    {"id": "middleware-blocks-infra-paths", "severity": "Critical", "title": "Auth middleware intercepts /robots.txt and /sitemap.xml", "detail": "Root cause of findings 1 and 2; middleware matcher needs an explicit allow-list for public/static/infra paths."},
    {"id": "app-subdomain-missing", "severity": "High", "title": "app.mulak.app does not resolve in DNS", "detail": "Brief assumes app lives at app.mulak.app; in reality product and marketing page are both served from www.mulak.app."},
    {"id": "auth-pages-indexable", "severity": "High", "title": "/login and /signup indexable with duplicate metadata", "detail": "Both return 200, no noindex, no canonical, and share the homepage's title/meta description."},
    {"id": "forgot-password-broken", "severity": "Medium", "title": "/forgot-password redirects unauthenticated users to /login", "detail": "Linked from login form but not reachable pre-auth; likely a middleware matcher bug."},
    {"id": "redirect-status-code", "severity": "Medium", "title": "307 used for permanent host canonicalization (apex -> www)", "detail": "Recommend 308/301 for permanent redirects."},
    {"id": "no-hreflang-urls", "severity": "Medium", "title": "No locale-specific URLs for Arabic content", "detail": "Language toggle is client-side only; no /ar path exists, so hreflang cannot be implemented in the sitemap yet."},
    {"id": "duplicate-meta", "severity": "Medium", "title": "All pages share identical title/meta description", "detail": "\"Mulak — Property Management\" / \"Property management dashboard for Dubai portfolio\" appears on /, /login, /signup."},
    {"id": "thin-site", "severity": "Low", "title": "Only one real marketing URL on the domain", "detail": "No pricing/features/about/blog/docs pages despite in-page anchors implying sections exist."}
  ],
  "sitemap_generated": true,
  "sitemap_path": "/root/agents/seo/sitemap.md#6-generated-sitemapxml",
  "urls_in_generated_sitemap": 1
}
```
