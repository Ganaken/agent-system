# Schema.org Structured Data Audit — mulak.app

**Date:** 2026-07-14
**URL audited:** https://mulak.app/ (redirects 307 → https://mulak.app/ → 200 final at https://www.mulak.app/)
**Site type:** Next.js SSR single-page marketing site (App Router, server-rendered — confirmed via raw HTTP fetch, no Playwright render needed; `is_spa=False`, raw HTML fully populated at 49,333 bytes).
**Fetch method:** `fetch_page.py` (raw HTTP, SSR-complete) + `parse_html.py` for JSON-LD/microdata/RDFa extraction; confirmed with direct `grep` for `application/ld+json`, `itemscope`, `itemtype`, `vocab=`.

---

## 1. Detection Results

| Format | Found | Count |
|---|---|---|
| JSON-LD (`<script type="application/ld+json">`) | **No** | 0 |
| Microdata (`itemscope`/`itemtype`) | **No** | 0 |
| RDFa (`vocab="http://schema.org"`) | **No** | 0 |
| Open Graph tags | **No** | 0 |
| Twitter Card tags | **No** | 0 |
| `<link rel="canonical">` | **No** | absent |
| hreflang alternates | **No** | absent (despite EN/العربية toggle in nav) |

**Zero structured data of any kind exists on the page.** This is a from-scratch build, not a repair job. No deprecated/retired schema (HowTo, FAQPage, SpecialAnnouncement, CourseInfo, EstimatedSalary, LearningVideo) is present either — nothing to remove, but also nothing to build on.

### Site content inventory (for schema-mapping)
- **Product name:** Mulak — "Every property, one question away."
- **Parent/legal entity:** Ganaken (footer: "© 2026 Ganaken", "About Ganaken")
- **Meta description:** "Property management dashboard for Dubai portfolio"
- **Category:** AI assistant / SaaS for landlords (UAE) — natural-language Q&A over rent, cheques, contracts, ROI
- **Pricing (visible on page):**
  - *Individual* — Free for 14 days, then **AED 1000/mo**, no card required to start
  - *Business* (agencies) — Custom / "Priced per portfolio" — quote-only, no listed price
- **Contact:** hello@mulak.app (only real contact channel found)
- **Social links found:** `https://x.com/`, `https://www.linkedin.com/`, `https://wa.me/` — **all three are generic un-parameterized root URLs, not the company's actual profile/handle links.** These are effectively broken placeholders and must NOT be used as `sameAs` values until corrected to real profile URLs.
- **Site structure:** true single-page app — all nav items (`Product`, `Features`, `Pricing`) and footer links (`About Ganaken`, `Careers`, `Contact`, `Blog`, `Privacy`, `Terms`, `Data residency`) resolve to in-page anchors (`#how`, `#features`, `#pricing`) or `mailto:hello@mulak.app`. **No dedicated URLs exist yet** for About, Careers, Blog, Privacy, Terms, Data Residency — these are visual footer entries with no real destination.
- **No logo image asset detected** (no `<img>` with logo-like src; only favicon.ico and hero/screenshot images `/landing/dashboard.png`, `/landing/chat.png`, `/landing/network.png`, `/landing/calendar.png`, `/landing/unit.png`, `/landing/dubai-skyline.webp`).
- **No FAQ section and no genuine user Q&A content** exists on the page — no FAQPage/QAPage opportunity currently.
- **A "How it works" 3-step section exists** (Add your properties → Ask in plain words → Stay ahead). This is structurally HowTo-shaped but **HowTo rich results were removed by Google in September 2023 — do not implement, per standing rule**, regardless of content shape.

---

## 2. Validation Results

Not applicable — there is nothing to validate. Checklist status against the 7-point rubric: **0/7 blocks exist to check.** This itself is the finding: a SaaS pricing page with zero machine-readable entity, product, or offer data is invisible to Google's structured-data pipeline and materially harder for LLM/AI answer engines to cite accurately (no canonical price, no canonical entity name, no disambiguation between "Mulak" the product and "Ganaken" the company).

---

## 3. Missing Schema Opportunities (ranked)

| Priority | Type | Why |
|---|---|---|
| **Critical** | `Organization` | No machine-readable entity for "Ganaken" (the legal company) exists anywhere. Without it, Google/AI engines cannot disambiguate publisher vs. product, and there is no foundation for Knowledge Panel or entity-graph eligibility. |
| **Critical** | `SoftwareApplication` + `Offer` (pricing) | This is a SaaS pricing page with a clear, stated price (AED 1000/mo) and no structured price anywhere. This is the single highest-value gap — it blocks price rich results and denies AI shopping/comparison assistants a citable, structured price. |
| **High** | `WebSite` | No canonical machine-readable site name/description/publisher link. Cheap to add, reinforces entity resolution alongside Organization. |
| **Medium** | `BreadcrumbList` | Low value **today** because the site is a single URL with anchor-only navigation — there is no multi-page hierarchy to mark up. Revisit once `/blog`, `/pricing`, `/about` etc. become real routes (footer already implies they should exist). |
| **Info** | `FAQPage` | Not applicable — no FAQ content exists on the page today. If one is added later: Google retired FAQ rich results for all sites on 2026-05-07, so a new FAQPage would carry no SERP benefit. Still acceptable to add for AI/LLM citation (GEO) purposes only — do not expect a SERP feature. |
| **Info** | `QAPage` | Not applicable — no genuine user-submitted Q&A UI exists. If landlord-facing Q&A/community content is ever built, use `QAPage`, not `FAQPage`. |
| **N/A — do not implement** | `HowTo` | The "How it works" 3-step section is structurally HowTo-shaped, but HowTo rich results were removed September 2023. Do not mark this section up as HowTo under any circumstance. |

### Supporting technical gaps that reduce schema effectiveness (flagged, not literally "schema" but block correct implementation)
- **No canonical URL** (`<link rel="canonical">`) — the redirect chain (`mulak.app` → 307 → `mulak.app` → 200 at `www.mulak.app`) means the "URL of record" for `url`/`@id` values must be pinned to `https://www.mulak.app/` explicitly; without a canonical tag this is ambiguous to crawlers. **High** priority to fix alongside schema rollout.
- **No logo asset** — Organization schema conventionally includes `logo` (ImageObject, ≥112×112px per Google's Organization guidelines) for Knowledge Panel eligibility. None exists; recommend commissioning/exposing a dedicated logo file before adding `logo` to the Organization block (not fabricated here, per "no placeholder" rule).
- **`sameAs` unavailable** — the three social links present (`x.com/`, `linkedin.com/`, `wa.me/`) are generic root URLs, not the company's real handles. Do not populate `sameAs` with these; fix the links first, then add `sameAs`.
- **No Open Graph / Twitter Card tags** — separate from Schema.org but same root cause (metadata not yet implemented in the Next.js `<head>`); worth fixing in the same engineering pass.

---

## 4. Generated JSON-LD (ready to paste)

Single `<script>` block using `@graph` to bundle Organization, WebSite, and SoftwareApplication with linked `@id` references. Paste into the Next.js root layout `<head>` (e.g., via `generateMetadata`/`<script type="application/ld+json">` in `app/layout.tsx`) so it renders in the initial SSR payload (confirmed this page is already fully SSR'd — no hydration-only injection needed).

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.mulak.app/#organization",
      "name": "Ganaken",
      "url": "https://www.mulak.app/",
      "email": "hello@mulak.app",
      "brand": {
        "@type": "Brand",
        "name": "Mulak"
      },
      "areaServed": {
        "@type": "Country",
        "name": "United Arab Emirates"
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://www.mulak.app/#website",
      "url": "https://www.mulak.app/",
      "name": "Mulak",
      "description": "Property management dashboard for Dubai portfolio",
      "publisher": { "@id": "https://www.mulak.app/#organization" },
      "inLanguage": "en"
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://www.mulak.app/#software",
      "name": "Mulak",
      "url": "https://www.mulak.app/",
      "description": "AI assistant for landlords. Ask anything about your rentals — rent, cheques, contracts, returns — and get an answer in seconds. Sends reminders before every payment is due and every contract expires.",
      "applicationCategory": "BusinessApplication",
      "applicationSubCategory": "Property Management Software",
      "operatingSystem": "Web",
      "inLanguage": ["en", "ar"],
      "areaServed": {
        "@type": "Country",
        "name": "United Arab Emirates"
      },
      "screenshot": "https://www.mulak.app/landing/dashboard.png",
      "featureList": [
        "Natural-language AI Q&A over portfolio data (English or Arabic)",
        "WhatsApp and email reminders before cheque due dates and contract expiry",
        "Automated monthly portfolio reports",
        "Live network map of buildings, units, tenants and cheques",
        "Year-view timeline calendar for dues and renewals",
        "Centralized contract and cheque document storage",
        "ROI, gross yield and occupancy analytics per unit",
        "Live portfolio dashboard"
      ],
      "publisher": { "@id": "https://www.mulak.app/#organization" },
      "provider": { "@id": "https://www.mulak.app/#organization" },
      "offers": [
        {
          "@type": "Offer",
          "name": "Individual plan",
          "url": "https://www.mulak.app/#pricing",
          "priceCurrency": "AED",
          "price": "1000",
          "availability": "https://schema.org/InStock",
          "category": "Subscription",
          "priceSpecification": {
            "@type": "UnitPriceSpecification",
            "price": "1000",
            "priceCurrency": "AED",
            "unitText": "MONTH",
            "billingDuration": {
              "@type": "QuantitativeValue",
              "value": 1,
              "unitCode": "MON"
            }
          },
          "eligibleRegion": {
            "@type": "Country",
            "name": "United Arab Emirates"
          }
        },
        {
          "@type": "Offer",
          "name": "14-day free trial",
          "url": "https://www.mulak.app/#pricing",
          "priceCurrency": "AED",
          "price": "0",
          "availability": "https://schema.org/InStock",
          "description": "14 days free, no card required. Applies to the Individual plan.",
          "eligibleDuration": {
            "@type": "QuantitativeValue",
            "value": 14,
            "unitCode": "DAY"
          }
        }
      ]
    }
  ]
}
```

**Validated:** valid JSON (parsed with `json.loads`), `@context` is `https://schema.org` (not http), all URLs absolute, no placeholder text, no deprecated types, currency is ISO 4217 (`AED`), region uses `Country` entity rather than a raw string for machine-readability.

**Deliberately omitted / left for follow-up (do not fabricate):**
- `Organization.logo` — no real logo asset exists yet; add once available (must be ≥112×112px per Google Organization guidelines).
- `Organization.sameAs` / `SoftwareApplication.sameAs` — the site's current X/LinkedIn/WhatsApp links are generic root URLs, not real profile links; populate only after they're fixed to point at Mulak's/Ganaken's actual profiles.
- `aggregateRating` / `review` on SoftwareApplication — no reviews or ratings exist on the page; do not fabricate to chase rich-result eligibility (this is a Google spam-policy violation risk, not just a quality issue).
- A structured `Offer` for the **Business** ("Custom"/"Priced per portfolio") tier — no real number exists to encode; adding an `Offer` without a genuine `price` or `priceSpecification` would itself be invalid/spec-violating. Add this once agency pricing is published, or model it later as a `priceRange` if a public band becomes available.
- `WebSite.potentialAction` (`SearchAction`) — **not applicable**: the site has no on-site search feature to describe. Do not add a fake SearchAction just to chase the sitelinks-searchbox feature.
- `BreadcrumbList` — not applicable to a single-URL anchor-nav site; revisit once `/pricing`, `/blog`, `/about` etc. become real routes.

---

## 5. Summary Table for `audit-data.json` (Schema / Structured Data category)

```json
{
  "category": "schema_structured_data",
  "url": "https://www.mulak.app/",
  "schema_score": 8,
  "existing_schema_blocks": 0,
  "formats_detected": [],
  "deprecated_schema_found": [],
  "issues": [
    {"severity": "critical", "issue": "No Organization schema present — entity (Ganaken) unresolvable to Google/AI engines."},
    {"severity": "critical", "issue": "No SoftwareApplication/Offer schema — stated AED 1000/mo price is fully unstructured."},
    {"severity": "high", "issue": "No WebSite schema."},
    {"severity": "high", "issue": "No canonical tag; redirect chain (mulak.app -> www.mulak.app) leaves URL of record ambiguous for @id/url values."},
    {"severity": "medium", "issue": "sameAs candidates (X/LinkedIn/WhatsApp) are generic placeholder root URLs, not real profile links — cannot be used until fixed."},
    {"severity": "medium", "issue": "No logo asset for Organization.logo (Knowledge Panel eligibility blocked)."},
    {"severity": "low", "issue": "BreadcrumbList not applicable — single-page anchor-nav site, no URL hierarchy yet."},
    {"severity": "info", "issue": "FAQPage/QAPage not applicable — no FAQ or Q&A content exists on the page currently."},
    {"severity": "info", "issue": "'How it works' 3-step section is HowTo-shaped but HowTo rich results were removed Sept 2023 — do not mark up."}
  ],
  "recommended_additions": ["Organization", "WebSite", "SoftwareApplication+Offer"],
  "generated_jsonld_ready": true
}
```
