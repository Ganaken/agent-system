# GEO / AI-Search-Readiness Audit — mulak.app

**Audited:** 2026-07-14
**Site:** https://mulak.app (Mulak — AI property-management assistant for landlords, UAE, bilingual EN/Arabic, by parent company "Ganaken")
**Method:** `render_page.py` (raw + Playwright-rendered fetch), direct `curl` header/redirect inspection, HTML/DOM analysis, WebFetch-based search-visibility check (DuckDuckGo HTML).

---

## GEO Readiness Score: 32 / 100 (Poor)

| Dimension | Weight | Score /100 | Weighted |
|---|---|---|---|
| Citability | 25% | 35 | 8.75 |
| Structural Readability | 20% | 40 | 8.00 |
| Multi-Modal Content | 15% | 25 | 3.75 |
| Authority & Brand Signals | 20% | 12 | 2.40 |
| Technical Accessibility | 20% | 45 | 9.00 |
| **Total** | 100% | | **31.9 ≈ 32** |

Interpretation: the marketing homepage itself is server-rendered and contains one usable definitional sentence and explicit pricing, which keeps the floor from being near-zero. Everything else — crawler-facing infrastructure, entity/authority signals, and content depth beyond the single homepage — is missing or broken.

---

## 1. AI Crawler Accessibility

**No robots.txt exists.** Every request to `/robots.txt` is caught by the app's Next.js middleware and silently redirected to the `/login` screen, which returns **HTTP 200, `text/html`** (not `text/plain`, no directives at all).

```
curl -s -D - https://mulak.app/robots.txt
→ 307 → https://www.mulak.app/robots.txt
→ 307 → /login
→ 200 text/html (17,558 bytes — identical to the real /login page)
```

Because no parseable robots.txt is served, GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, anthropic-ai, and cohere-ai are all **implicitly allowed by default** (no disallow rules exist to block them) — but there is:
- No explicit `Allow:` for AI search crawlers (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot).
- No explicit `Disallow:` for training-only crawlers (CCBot, anthropic-ai, cohere-ai) if the operator wants to opt out of training use while keeping citation crawlers.
- No `Sitemap:` directive (moot today since there's effectively one indexable URL, but blocks future discovery).
- A real risk that some crawler robots-parsers, seeing a 200 response with HTML content instead of valid robots syntax, could behave unpredictably (Google's parser treats unparseable-200 as allow-all; not all bots follow the same spec).

**Verdict: Critical.** Functionally "open" but entirely accidental and unmanaged — there is no policy, and the delivery mechanism is broken.

## 2. llms.txt

**Absent**, and same failure mode as robots.txt: `/llms.txt`, `/llms-full.txt` both 307-redirect to `/login` and return the generic app-shell HTML (200, identical md5 to the login page). No llms.txt, no RSL 1.0 licensing file (`/rsl.xml` also redirects to the same login shell).

**Verdict: Critical gap** — zero curation of what LLMs should read first; no explicit content licensing stance (relevant since AI training/citation licensing, e.g. RSL, is an emerging signal).

## 3. Passage-Level Citability (homepage, SSR-verified real content)

The homepage **is genuinely server-rendered** (`is_spa: False`, real text in the raw HTML before any JS executes) — good baseline for crawler access to the one page that exists.

Extractable "what is it" statement (H1 + first paragraph, ~38 words):
> "Mulak is an AI assistant for landlords. Ask anything about your rentals — rent, cheques, contracts, returns — and get an answer in seconds. It reminds you before every payment is due and every contract expires."

- Below the 134–167 word optimal-citation length; a good sentence but not a self-contained paragraph-length answer block.
- Meta description: "Property management dashboard for Dubai portfolio" — the *only* place "Dubai" appears in machine-readable text on the whole page (body text mentions "Dubai" exactly once, no "UAE"/"United Arab Emirates" anywhere). A query like "AI property management UAE" or "landlord assistant Dubai" has very little on-page anchor text to match against.
- Pricing is explicit and extractable: "Individual … from AED 1000/mo … Unlimited natural-language questions … Cheque & contract reminders" / "Business … Custom … Priced per portfolio" — directly answers "How much does Mulak cost?" reasonably well.
- The 8 feature blurbs ("Ask in plain words", "Reminders on WhatsApp", "Monthly reports", etc.) are each ~15–30 words — too short individually to be optimal 134–167-word citation units, and not headed as questions.
- **Zero FAQ content**, **zero question-phrased headings** (all 5 H2s and 11 H3s are taglines like "Bring your portfolio into focus", not "How does Mulak help Dubai landlords?" or "What does Mulak do?").
- The visual "How it works" 3-step flow ("Add your properties" → "Ask in plain words" → "Stay ahead") is rendered as plain `<div>`s, **not a semantic `<ol>`** (0 `<ol>` tags on the page) — a missed easy win, since numbered/ordered HTML lists are disproportionately favored for AI Overviews' "how to" answer boxes.
- All of this citable content exists **on one URL only**. There is no dedicated pricing page, no security/trust page, no about page, no blog — see Section 6.

## 4. Authority & Brand / Entity Signals

- **No structured data at all**: `application/ld+json` count = 0. No `Organization`, `SoftwareApplication`, `Product`, `FAQPage`, or `Offer` schema anywhere.
- **No canonical tag, no hreflang tags** despite the product being explicitly bilingual EN/Arabic (`<html lang="en">` is hardcoded even though the UI toggles to "العربية"). The Arabic experience is a client-side toggle, not a separate crawlable URL (`/ar` and `/?lang=ar` both just serve the same English-shell HTML — no distinct Arabic-language document for an Arabic-query AI crawler to fetch/cite).
- **No Open Graph or Twitter Card tags** (`og:title`, `og:description`, `og:image`, `twitter:card` all absent) — reduces how link previews/AI browsing tools summarize the brand when shared.
- **No external corroboration found.** A DuckDuckGo-HTML search for `"Mulak" property management Dubai landlord` returned only mulak.app's own pages (home/signup/login). No Wikipedia, Reddit, YouTube, LinkedIn, Crunchbase, G2, or Capterra listings. Per the brand-mention correlation table, YouTube presence (~0.737 correlation) and Reddit presence are the strongest predictors of AI citation — Mulak has neither.
- **Name-collision risk**: search results surfaced an unrelated "etihad Mulak" real-estate discount platform (magnitt.com) and a Saudi property-services registration product called "Mulak"/"Amlak" (amlak.net.sa). A generic, short brand name with no disambiguating entity markup (no Organization schema, no Wikipedia page, no `sameAs` links) makes it easy for an LLM to conflate "Mulak" with these other entities in the same regional real-estate space.
- Footer shows "© 2026 Ganaken" (the parent company) but there is no About page to explain the Mulak↔Ganaken relationship, no team/founder bios, no press mentions, no customer logos/testimonials/case studies anywhere on the site.
- **Verdict: this is the weakest dimension by far (12/100).** There is essentially no machine-readable entity definition and no third-party corroboration for an LLM to draw on when deciding whether Mulak is a real, notable, trustworthy product.

## 5. Technical Accessibility for AI Crawlers

- Homepage: SSR confirmed, real content present pre-JS, single 307 redirect (apex → `www`) before the 200 — acceptable overhead.
- **Critical routing defect**: virtually every non-homepage path returns HTTP 200 with **byte-identical content** to the `/login` screen (md5-verified), instead of a real page or a proper 404:
  - `/about`, `/blog`, `/security`, `/company`, `/privacy`, `/terms`, `/legal`, `/legal/privacy`, `/data-residency`, `/careers`, `/robots.txt`, `/llms.txt`, `/llms-full.txt`, `/sitemap.xml`, `/rsl.xml`, `/humans.txt`, `/.well-known/ai-plugin.json`, `/ar` → **all identical 200/17,558-byte login shell**, same `<title>Mulak — Property Management</title>` and same meta description as the homepage.
  - By contrast `/pricing` and `/contact` correctly return real Next.js 404s — showing the middleware/catch-all is inconsistent, not intentional design.
  - Net effect: dozens of distinct URLs referenced in the site's own footer navigation (Product / Company / Legal columns) serve duplicate thin content to any crawler that follows them. This wastes AI-crawler budget, creates a duplicate-content signal, and means there is **no real Privacy Policy or Terms of Service reachable at all** — a trust/compliance gap as much as a GEO one.
- No `sitemap.xml` for URL discovery (low urgency today given the single real page, but blocks scaling once real subpages are built).
- Images: 7 `<img>` tags, 6 of 7 have descriptive alt text (one hero/decorative image missing alt) — a minor positive.
- No `<video>` or YouTube embed anywhere on the page.

## 6. Content Structure (Single-Page-Site Problem)

Mulak.app is architecturally a **one-page marketing site** — Product/Features/Pricing/How-it-works/Company are all anchor sections on `/`, not separate URLs. Combined with the middleware defect above, this means:
- There is no page that can independently rank/be cited for "Mulak pricing," "Mulak security," "About Mulak," or "Mulak blog" queries — a searcher/AI whose query matches one of those intents gets either the whole undifferentiated homepage or (worse) the broken login-shell duplicate.
- No blog/resource content exists for topical, longer-tail UAE property-management questions (e.ondage cheque-based rental payments, RERA compliance, Ejari, etc.) that would be natural AI-citation opportunities for this vertical.

---

## Platform-Specific Assessment

| Platform | Est. Score /100 | Rationale |
|---|---|---|
| Google AI Overviews | ~25 | No schema, no sitemap, no E-E-A-T signals (no author/about/reviews); thin site depth limits eligible queries to brand-name lookups only. |
| ChatGPT Search (GPTBot/OAI-SearchBot) | ~35 | SSR homepage is fetchable and has one clean definitional sentence + explicit pricing; but no llms.txt curation and no supporting pages cap upside. |
| Perplexity | ~20 | Perplexity weights external corroboration (Reddit/YouTube/reviews) heavily — none found; no cited statistics on-page. |
| Bing Copilot | ~25 | No schema/IndexNow signal observed; same thin-depth ceiling as Google AIO. |

Only 11% of domains get cited by both ChatGPT and Google AI Overviews — Mulak's current gaps (no schema, no external corroboration, single page) put it well outside that overlap today.

---

## Top 5 Highest-Impact Changes

1. **[Critical, Low effort]** Fix the middleware/catch-all so `/robots.txt`, `/llms.txt`, `/sitemap.xml` and the footer-linked pages (`/about`, `/privacy`, `/terms`, `/security`, `/blog`, `/company`, `/data-residency`, `/careers`) return real content (or genuine 404s) instead of a duplicated `/login` shell. This is a routing/middleware bug, not a content problem — likely a few hours of engineering work, and it blocks every other fix below.
2. **[Critical, Low-Medium effort]** Publish a real `robots.txt` (explicit `Allow:` for GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot; explicit policy for CCBot/anthropic-ai/cohere-ai) and a curated `/llms.txt` summarizing what Mulak is, who it's for, and links to key sections/pages.
3. **[High, Low effort]** Add `Organization` + `SoftwareApplication` JSON-LD schema (name, description, `sameAs` to any real social/profile URLs, `offers` with the AED 1000/mo price), plus Open Graph/Twitter meta tags and a canonical tag. This directly addresses the weakest dimension (Authority, 12/100) and the brand-collision risk with unrelated "Mulak/Amlak" entities.
4. **[High, Medium effort]** Rewrite homepage copy into self-contained, question-headed answer blocks (e.g., H2 "What is Mulak?", "How does Mulak help landlords in Dubai?", "How much does Mulak cost?") each 100–170 words, expand the geographic anchor text (mention "Dubai," "UAE" explicitly multiple times, not once), and convert the "How it works" steps into a real semantic `<ol>`.
5. **[Medium, Higher effort]** Build genuine external corroboration and content depth: a real `/blog` with UAE-specific property-management topics, a demo/explainer video on YouTube (strongest citation correlate, ~0.737), and pursue listings on G2/Capterra/Crunchbase plus a Wikipedia/Wikidata entry or at minimum consistent LinkedIn/Reddit presence.

---

## Raw Data Reference

- Homepage raw HTML fetch: title `Mulak — Property Management`; meta description `Property management dashboard for Dubai portfolio`; `is_spa: False`; 1 H1, 5 H2, 11 H3, 0 `<ol>`, 7 `<img>` (6/7 with alt text), 0 JSON-LD blocks, no canonical/hreflang/OG/Twitter tags.
- robots.txt / llms.txt / llms-full.txt / sitemap.xml / rsl.xml / humans.txt / `.well-known/ai-plugin.json` / about / blog / security / company / privacy / terms / legal / legal/privacy / data-residency / careers / `/ar`: all `HTTP 200`, `text/html`, 17,558 bytes, md5 `0fdf3df0fd454df921e637738f87c119` (identical to `/login`).
- `/pricing` → real `HTTP 404` (12,856 bytes, genuine Next.js not-found page). `/contact` → real `HTTP 404`.
- Body text term counts (homepage): Dubai=1, UAE=0, "United Arab Emirates"=0, AED=5, Arabic=3, landlord=4, Ganaken=2.
- DuckDuckGo HTML search for `"Mulak" property management Dubai landlord`: only mulak.app's own home/signup/login pages returned; no Wikipedia/Reddit/YouTube/Crunchbase/G2/Capterra; unrelated "etihad Mulak" (magnitt.com) and Saudi "Mulak/Amlak" property-services product (amlak.net.sa) surfaced as brand-collision risks.
- Definitional passage (candidate "What is Mulak?" answer, ~38 words): "Mulak is an AI assistant for landlords. Ask anything about your rentals — rent, cheques, contracts, returns — and get an answer in seconds. It reminds you before every payment is due and every contract expires."
- Pricing passage (candidate "How much does it cost?" answer): "Individual … Free 14 days, then from AED 1000/mo … Unlimited natural-language questions, Cheque & contract reminders, ROI/occupancy/yield per unit, Unified timeline calendar." / "Business … Custom, Priced per portfolio … Multi-landlord client workspaces, Bank-grade tenant isolation per client, Priority support & onboarding."
