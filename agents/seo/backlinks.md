# Backlink Profile Audit: mulak.app

**Date:** 2026-07-14
**Market:** UAE proptech SaaS
**Data tier:** Tier 0 (Common Crawl web graph + verification crawler only). No Moz, Bing, or DataForSEO credentials configured.

---

## 1. Credential / Tier Check

```
python3 scripts/backlinks_auth.py --check --json
```

- Tier: **0 — Basic (Common Crawl + Verify only)**
- Common Crawl: available (public data, no key needed)
- Verification crawler: available (local, no key needed)
- Moz API: **not configured** — no DA/PA, no spam score, no anchor text data
- Bing Webmaster: **not configured** — no inbound link list, no competitor gap comparison
- DataForSEO: not available (no MCP tools detected)

**Implication:** at Tier 0, only domain-level graph position from Common Crawl is available. There is no way to get a referring-domain count, a link count, a spam score, or an anchor-text distribution from free sources alone. Any of those specific figures below Tier 1 would have to be fabricated — so they are reported as **not available**, not as zero.

---

## 2. Common Crawl Domain-Level Metrics

```
python3 scripts/commoncrawl_graph.py mulak.app --json
```

| Field | Value |
|---|---|
| In Common Crawl crawl set | **No** |
| In Common Crawl rankings (PageRank/harmonic) | No |
| PageRank | null |
| PageRank rank | null |
| Harmonic centrality | null |
| Harmonic centrality rank | null |
| Referring domains (CC graph) | Not resolvable — see limitation below |
| Release queried | cc-main-2026-jan-feb-mar (latest available) |

**Finding:** `mulak.app` does not appear in the Common Crawl hyperlink graph at all (neither the vertices/crawl set nor the PageRank rankings file).

**Correct interpretation (important — do not over-read this):**
- This does **not** mean "zero backlinks" or "low authority." It means Common Crawl's crawler has not captured this domain in its dataset as of the latest quarterly release (Jan-Mar 2026).
- Common Crawl only samples a fraction of the web each quarter, and coverage skews toward domains that are already well-linked, older, or picked up via seed lists. A domain that is new, small, geo-specific (.app TLD, UAE-focused), or has few/no external links pointing to it from *already-crawled* pages can easily be absent — this is expected and consistent with a young SaaS product, not a red flag on its own.
- Confidence: 0.50 (per skill convention for CC domain-level data), and in this specific case there is literally no numeric metric to attach that confidence to — the result is an absence, not a low score.

**Known tool limitation (not domain-specific):** even when a domain *is* found in the CC graph, this script's rankings lookup only returns PageRank/harmonic-centrality scalar values. The "top referring domains" feature is not implemented in the current version of `commoncrawl_graph.py` — the edges file uses numeric vertex IDs rather than domain names, and no vertex-ID-to-domain mapping is built. So even at Tier 0 with a domain that *is* in CC, this script cannot currently surface named referring domains. This is a script limitation to flag for maintainers, not evidence about mulak.app.

---

## 3. Backlink Verification Crawler

```
python3 scripts/verify_backlinks.py --target https://mulak.app --links <file> --json
```

**Not run.** This script verifies a *supplied* list of candidate backlink URLs (format: `[{"source_url": "..."}]`) against the target — it does not discover new links on its own. No candidate backlink list was provided by the user or surfaced by any other Tier 0 source (CC returned no referring domains to seed a list with).

**Action item:** if the user has any known link sources — e.g., a directory listing, a press mention, a partner site, a startup-accelerator portfolio page — supply those URLs and this crawler can verify live status, follow/nofollow (where inferable from raw HTML), and anchor text for each one. Note that it is a raw-HTML fetch by default; JS-rendered link injection (e.g., links added by React/Next.js client-side hydration on directory sites) would show as "unverifiable_js," not "not found," per the skill's error-handling rules.

---

## 4. Site Context (for interpretation only — not a backlink signal)

A raw HTML fetch of the homepage (`render_page.py`, mode=never) confirms the site is live and returns HTTP 200, built on Next.js, with a "dubai-skyline.webp" hero image and a "dashboard.png" product screenshot — consistent with a UAE-market proptech SaaS product. This is included only to confirm the domain is a real, active, recently-built product (consistent with CC not having crawled it yet), not as a backlink/authority finding.

---

## 5. Off-Page / Authority Score

**Score: INSUFFICIENT DATA — no numeric score reported.**

Per the skill's scoring rubric, a Backlink Health Score draws on 7 weighted factors (referring domain count, domain quality distribution, anchor text naturalness, toxic link ratio, link velocity, follow/nofollow ratio, geographic relevance). At Tier 0 with a domain absent from the CC graph:

| Factor | Weight | Data available? |
|---|---|---|
| Referring domain count | 20% | No |
| Domain quality distribution | 20% | No |
| Anchor text naturalness | 15% | No |
| Toxic link ratio | 20% | No |
| Link velocity trend | 10% | No (DataForSEO-only factor) |
| Follow/nofollow ratio | 5% | No |
| Geographic relevance | 10% | No |

**Factors with data: 0 of 7.** This is well below the 4-factor minimum required to produce a defensible numeric score. Automated validation (`validate_backlink_report.py`) confirms: producing a score here would be flagged as an error ("misleading — report INSUFFICIENT DATA instead"). Reporting a number like "15/100" would imply the site has a *measurably weak* profile, when in fact it means *we have no measurement at all* — those are different findings and conflating them would mislead the client.

**What we can say directly:** the domain is new/small enough, or narrow enough in existing inbound links, that it hasn't surfaced in a major public web-graph dataset yet. That is a realistic and unremarkable state for a recently-launched vertical SaaS product — it is not evidence of a penalty, toxic links, or technical blocking.

---

## 6. Realistic Expectations

- A UAE-focused proptech SaaS at this stage should expect **near-zero pre-existing backlink equity**. Do not benchmark against established competitors' DA/referring-domain counts yet — there is nothing to compare, and premature benchmarking (impossible without Moz/DataForSEO anyway) would set the wrong baseline.
- The near-term goal is **not** "catch up to competitor DA" — it's "get indexed in the handful of authoritative regional and vertical sources that Google/Bing already trust," which will also be what eventually gets the domain picked up in the next Common Crawl crawl (quarterly).
- Recommend re-running `commoncrawl_graph.py mulak.app --json --update` after the next quarterly CC release (next expected ~cc-main-2026-apr-may-jun) to check for first appearance in the graph as an early leading indicator of external link acquisition.
- Strongly recommend enabling Tier 1 (Moz free tier, 2,500 rows/month) immediately — it is free and would unlock DA/PA, spam score, and a real referring-domain count instead of a binary in/out-of-crawl signal. This is the single highest-leverage next step for measurement, independent of any link-building work.

---

## 7. Link-Building Starting Strategy — UAE Proptech SaaS

Prioritized, sorted by cost/effort vs. expected authority + relevance signal for a UAE real-estate-tech audience.

### Critical
1. **UAE business/company directories & registries** — get baseline citations and NAP-style profile links from high-trust, low-effort sources: Dubai Chamber of Commerce member directory, DED (Dubai Economic Department) if applicable, Bayut/Property Finder "partners/tools" pages (if a data or integration partnership can be arranged), Crunchbase, AngelList/Wellfound, and Clutch/GoodFirms (B2B SaaS directories with a "Real Estate Software" category). These are low-authority individually but establish a crawlable footprint fast and are exactly the kind of link Common Crawl's *next* crawl is likely to pick up.
2. **UAE startup ecosystem hubs** — apply for/get listed in Dubai Future Foundation, in5 (Dubai's tech/startup incubator), Hub71 (Abu Dhabi), DIFC FinTech Hive (if any fintech-adjacent proptech angle applies), and Dubai SME. These carry real topical + geographic authority signal for a UAE B2B SaaS and often come with a portfolio-page backlink as a natural byproduct of joining a program — not a purchased link.

### High
3. **Proptech/real-estate trade press (earned coverage, not paid placements)** — pitch product launch/funding/feature stories to Arabian Business, Gulf Business, MEED, Construction Week Online (real estate/PropTech vertical), and Property Finder's/Bayut's own industry-insight blogs (as a source/quote, not guest post spam). A single earned link from Arabian Business or Gulf Business will carry more weight than dozens of directory links.
4. **Regional startup/tech media** — Wamda, MAGNiTT (MENA startup data + directory — also doubles as a directory-style listing), and Entrepreneur Middle East. MAGNiTT in particular maintains a searchable startup database that functions as both a citation and a link.

### Medium
5. **Industry association & event listings** — Cityscape Global/Cityscape Abu Dhabi exhibitor pages, RICS Middle East, and Dubai Land Department-adjacent proptech showcases (if participating as exhibitor/sponsor, confirm the event site links to sponsor domains).
6. **Integration/partner co-marketing links** — if mulak.app integrates with or is built on common SaaS stacks (payment gateways, CRM, property listing APIs), request placement in the partner/integrations directory of those platforms — a natural, relevant, low-toxicity link source.
7. **Guest content on B2B SaaS/PropTech blogs** (not link farms) — contribute genuinely useful proptech operations/analytics content to established SaaS or real-estate blogs with real UAE readership; anchor text should stay natural/branded, not exact-match commercial keywords, to keep the eventual anchor-text distribution healthy once it's measurable.

### Low
8. **Social profiles & business-listing platforms** (LinkedIn Company Page, Google Business Profile if there's a physical UAE office) — minimal direct SEO link value (mostly nofollow) but supports brand-entity signals and indirectly aids discovery by other linkers/journalists.

**Cross-skill note:** this strategy addresses off-page authority only. For on-page readiness (content depth/E-E-A-T that makes the domain "worth linking to" once discovered), recommend `/seo content <url>`. For crawlability/indexability that determines whether Common Crawl and Google can find and follow these new links once acquired, recommend `/seo technical <url>`.

---

## 8. Raw Data

### `backlinks_auth.py --check --json`
```json
{
  "status": "success",
  "tier": {
    "tier": 0,
    "description": "Basic (Common Crawl + Verify only)",
    "capabilities": [
      "Common Crawl domain-level graph (PageRank, in-degree)",
      "Backlink verification crawler"
    ],
    "missing": "Add Moz API key for DA/PA and spam scoring. Free at https://moz.com/products/api (2,500 rows/month)"
  },
  "services": {
    "moz": {"available": false, "method": "api_key", "service": "Moz Link Explorer API"},
    "bing": {"available": false, "method": "api_key", "service": "Bing Webmaster Tools API"},
    "commoncrawl": {"available": true, "method": "none (public data)", "service": "Common Crawl Web Graph", "cached_domains": 0},
    "verify": {"available": true, "method": "none (local crawler)", "service": "Backlink Verification Crawler"}
  }
}
```

### `commoncrawl_graph.py mulak.app --json`
```json
{
  "status": "success",
  "data": {
    "domain": "mulak.app",
    "in_crawl": false,
    "in_rankings": false,
    "pagerank": null,
    "pagerank_rank": null,
    "harmonic_centrality": null,
    "harmonic_centrality_rank": null,
    "n_hosts": null,
    "top_referring_domains": [],
    "referring_domains_sample": 0,
    "note": "Domain not found in Common Crawl data. It may be too new, too small, or not yet crawled."
  },
  "error": null,
  "metadata": {
    "source": "commoncrawl",
    "release": "cc-main-2026-jan-feb-mar",
    "from_cache": false,
    "timestamp": "2026-07-14T16:20:45Z"
  }
}
```

### `verify_backlinks.py`
Not run — no candidate backlink list supplied and none discoverable from Tier 0 sources.

### `validate_backlink_report.py --report report_data.json --json`
```json
{
  "status": "PASS",
  "data": {
    "total_issues": 1,
    "errors": 0,
    "warnings": 0,
    "infos": 1,
    "issues": [
      {
        "severity": "info",
        "field": "cc_data",
        "message": "Domain not found in Common Crawl. Do NOT interpret as 'low authority' — it means CC hasn't crawled it yet. Could be new, niche, or geo-specific (.ro, .jp, etc.)."
      }
    ]
  }
}
```
