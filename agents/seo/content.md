# Content Quality & E-E-A-T Audit — mulak.app

**Audited:** 2026-07-14
**Site:** https://mulak.app (canonical: https://www.mulak.app/) — AI property-management assistant for landlords, UAE/Dubai market, positioned bilingual EN/Arabic.
**Method:** `render_page.py` / `fetch_page.py` / `parse_html.py` / `content_quality.py` against the live homepage, plus manual `curl` probing of all linked/expected paths (about, blog, privacy, terms, careers, contact, help, docs, resources, faq, security, ar, pricing).

---

## 0. Headline finding

**mulak.app is a single marketing page.** Every internal nav/footer link that appears to point to a distinct page (`About Ganaken`, `Careers`, `Contact`, `Blog`, `Privacy`, `Terms`, `Data residency`, `Security`) is actually one of:

- an in-page anchor (`#how`, `#features`) that scrolls back to the same homepage section, or
- a bare `mailto:hello@mulak.app` link, or
- a placeholder social URL with no handle (`https://x.com/`, `https://www.linkedin.com/`, `https://wa.me/`).

Confirmed via raw HTML source:
```html
<div class="foot-col"><h4>Company</h4>
  <a href="#how">About Ganaken</a>
  <a href="mailto:hello@mulak.app">Careers</a>
  <a href="mailto:hello@mulak.app">Contact</a>
  <a href="#features">Blog</a>
</div>
<div class="foot-col"><h4>Legal</h4>
  <a href="mailto:hello@mulak.app">Privacy</a>
  <a href="mailto:hello@mulak.app">Terms</a>
  <a href="#how">Data residency</a>
</div>
```

Probing every plausible path confirms this (`curl -L -o /dev/null -w "%{http_code} %{size_download}"`):

| Path | HTTP | Bytes | Content served |
|---|---|---|---|
| `/`, `/ar`, `/about`, `/blog`, `/privacy`, `/terms`, `/careers`, `/help`, `/docs`, `/resources`, `/faq`, `/security` | 200 | 17,558 (identical) | Same homepage HTML, byte-identical, `<title>Mulak — Property Management</title>` for every path |
| `/pricing` | 404 | 12,856 | Next.js default 404 |
| `/robots.txt` | 307→200 | — | Redirects to and renders the **app login screen**, not a robots.txt file |
| `/sitemap.xml` | 307→200 | — | Same — redirects to the login screen, not valid XML |

Consequences:
- There is **no About/Team page, no Privacy Policy, no Terms of Service, no Contact page, no Careers page, no Blog, no Help/Docs/FAQ, no Security page** anywhere on the crawlable site — despite the footer explicitly labeling these as if they exist.
- `/ar` does not serve Arabic content; it serves the identical English homepage (`<html lang="en">`), so the "bilingual EN/Arabic" claim is not reflected in indexable/crawlable marketing content (Arabic strings only appear as a logo glyph "مُلاك" and a language toggle label "العربية", not as translated body copy).
- `robots.txt` and `sitemap.xml` do not resolve to valid files — they 307-redirect into the authenticated app's `/login` screen. This means Googlebot cannot read crawl directives or a sitemap at all (a technical-SEO defect with direct content-discovery consequences, flagged here because it blocks any secondary page from ever being found/indexed even if one existed).
- If Google indexes `/about`, `/blog`, `/privacy`, etc. as separate URLs, they will be exact-duplicate content of the homepage (same title, same meta description, same body) — a self-inflicted duplicate-content/soft-404 risk.

This single fact dominates every section below.

---

## 1. E-E-A-T Assessment

### Experience — 20% weight — **Score: 15/100**
- No case studies, no "how a Dubai landlord uses Mulak" narrative, no dated screenshots with attribution, no usage stats tied to real customers (numbers shown — AED 2.0M rent under management, 94% occupancy, 8 active units — read as illustrative demo data, not attributed to a named customer).
- No founder/operator "why we built this" story (a strong experience signal that's completely absent).
- No testimonials, reviews, or quotes from landlords/agencies anywhere in the HTML (`grep -i "testimonial|review|customer says"` → zero matches).

### Expertise — 25% weight — **Score: 20/100**
- No author bylines, no team bios, no named founders/execs, no credentials (property management, fintech, or AI background) disclosed.
- Copyright footer reads "© 2026 Ganaken" and "About Ganaken" — Ganaken is presumably the parent/operating company, but it is never explained anywhere (no link, no about text, no company registration detail). This creates more confusion than trust.
- No educational/expert content that would demonstrate domain expertise in UAE tenancy law, RERA regulation, post-dated cheque (PDC) handling, or Ejari — despite these being genuinely differentiating, expert-level topics for this market. The product literally manages cheques and contracts but never engages with the regulatory context in the marketing copy.

### Authoritativeness — 25% weight — **Score: 10/100**
- Social links are non-functional placeholders: `href="https://x.com/"`, `href="https://www.linkedin.com/"` (root domains, no company handle/slug) and `href="https://wa.me/"` (no phone number appended — broken WhatsApp CTA).
- No press mentions, no "as seen in," no client/partner logos, no integration partners (banks, Ejari, DEWA, etc.), no third-party review platform badges (G2, Capterra, Trustpilot), no backlinked citations.
- No schema.org structured data of any kind (`Organization`, `SoftwareApplication`, `FAQPage`, `Review` — all absent; `parse_html.py` returned `"schema": []`).

### Trustworthiness — 30% weight — **Score: 5/100**
- **No Privacy Policy and no Terms of Service exist as pages** — both footer links are `mailto:` only. For a product that stores tenant PII, bank/cheque images, and financial data ("bank-grade data isolation" is claimed in-copy), the absence of a published, linkable privacy policy is a severe compliance and trust failure (UAE PDPL exposure, plus it blocks App Store/Google Play/ad-platform requirements that mandate a hosted privacy policy URL).
- No physical company address, no registered legal entity name+number, no VAT/trade license disclosure anywhere on the marketing site.
- Interestingly, the **authenticated login page** (reachable via the broken robots.txt/sitemap.xml redirect) *does* display a trust badge — "Encrypted session · RERA · DLD compliant · UAE" — but this claim is not surfaced anywhere on the public marketing homepage where prospects actually evaluate the product before signing up. A compliance claim that only appears post-signup-intent has near-zero SEO/trust value and is arguably worse than omitting it, since it's not verifiable by a prospective customer doing due diligence, nor is it linked to any certification detail.
- Only contact method site-wide is a single mailto address; no phone number, no live chat (aside from a floating "Open AI chat" widget button of unclear function), no support hours, no registered support channel.

### Composite E-E-A-T score
`0.20×15 + 0.25×20 + 0.25×10 + 0.30×5 = 3.0 + 5.0 + 2.5 + 1.5 = 12/100`

---

## 2. Content Depth / Coverage vs. Page-Type Minimums

| Page type | Minimum (QRG floor) | mulak.app | Verdict |
|---|---|---|---|
| Homepage | 500 words | **561–610 words** (measured both via `parse_html.py` word_count=564 and manual extraction=561–610 depending on boilerplate stripping) | Passes floor, barely — and this is also serving as the *only* page, so it is simultaneously homepage + product page + pricing page + company page + security page |
| Service/product page | 800 words | N/A — no dedicated product page exists; product detail is compressed into ~8 short feature blurbs on the homepage | **Fails** — no page exists |
| Blog post | 1,500 words | N/A — `/blog` resolves to the homepage | **Fails** — no blog exists |
| Location page (Dubai/Abu Dhabi/Sharjah, etc.) | 500–600 words | N/A | **Fails** — no location pages exist, despite this being an explicitly Dubai/UAE-positioned product |

There is exactly **one indexable URL** carrying real content. All topical coverage that would normally live across a product page, a pricing page, a security/compliance page, a company/about page, and a content-marketing section is compressed into one ~600-word scroll. Per QRG, word count is not itself a ranking factor, but the complete absence of dedicated pages means there is no page to rank for adjacent, high-intent queries (see §5).

---

## 3. Readability

Computed manually (Flesch Reading Ease / Flesch-Kincaid Grade) on extracted homepage body text (561 words, 36 sentences):

| Metric | Value |
|---|---|
| Average sentence length | 15.6 words |
| Average syllables/word | 1.71 |
| Flesch Reading Ease | **45.9** (college level / "difficult") |
| Flesch-Kincaid Grade | **10.7** (10th–11th grade) |

Interpretation: sentence length is short and scannable (good for a landing page), but syllable density pushes Flesch Reading Ease into "difficult" territory, mostly driven by product/finance vocabulary (occupancy, portfolio, reminders, tenant isolation). For a B2B SaaS landing page this grade level is acceptable and not a major issue — the copy reads as tight, confident marketing prose rather than bloated filler.

`content_quality.py` output on the same text confirms clean prose mechanics:
```
overall_quality: 89/100
filler_score: 0/100
ai_pattern_score: 0/100
information_density: 0.853
repetition_score: 17/100
tokens: 551 (237 unique)
flags: [] (no filler / no AI-pattern / no thin-content / no repetition flags tripped)
```
Zero hits against both the QRG filler-phrase list and the LLM-boilerplate pattern list, and the density score is high because the copy is packed with concrete, specific figures (AED 15,300 cheque amounts, AED 1000/mo pricing, 94% occupancy, specific unit numbers like "Unit 203," "Unit 1304"). **The prose itself is genuinely well-written and not detectably AI-slop** — this is the one clearly positive finding in this audit. The problem is structural/coverage/trust, not sentence-level writing quality.

---

## 4. Thin Content Detection

- The single existing page clears the 300-token thin-content threshold comfortably (551 tokens counted by `content_quality.py`).
- However, every *other* URL a visitor or crawler would expect to exist (`/about`, `/privacy`, `/terms`, `/blog`, `/careers`, `/contact`, `/security`, `/help`, `/docs`, `/faq`, `/ar`) is **not thin — it's a full duplicate of the homepage**, which from a search-engine perspective is arguably worse than a short/thin unique page: it signals templated/placeholder scaffolding that was never filled in, and risks Google treating the domain as having very low unique-page density (1 unique page out of ~11 crawlable paths tested = ~9% unique-content ratio across sampled URLs).

---

## 5. AI Citation Readiness

| Signal | Present? | Detail |
|---|---|---|
| JSON-LD structured data (Organization, SoftwareApplication, FAQPage, Product) | **No** | `parse_html.py` → `"schema": []`. No `application/ld+json` block found anywhere in source. |
| Open Graph tags | **No** | Zero `og:*` meta tags found. |
| Twitter Card tags | **No** | Zero `twitter:*` meta tags found. |
| Canonical tag | **No** | `parse_html.py` → `"canonical": null` |
| hreflang (given bilingual claim) | **No** | `"hreflang": []`; `/ar` doesn't even serve `lang="ar"` |
| Clear, quotable factual claims | **Partial** | A few extractable facts exist ("14 days free, no card required," "from AED 1000/mo," "Individual vs. Business plans") but they're not marked up or isolated as structured Q&A/definitional content an AI Overview or LLM could cite with confidence. |
| Definitional/explainer content (e.g., "What is a post-dated cheque in UAE tenancy?", "What is RERA compliance?") | **No** | The product touches genuinely Dubai-specific concepts (PDC cheques, Ejari-style contracts) but never explains them — a missed opportunity for both AI-citation and organic long-tail capture. |
| FAQ content | **No** | No FAQ section/page/schema. |
| Author/publisher/dateModified metadata | **No** | No visible publish or last-updated date anywhere on the page. |

**AI citation readiness score: ~15/100.** The page has some quotable pricing/feature facts embedded in prose, but with no schema, no canonical, no OG/Twitter cards, no FAQ, and no definitional content, there is essentially nothing structured for an LLM or AI Overview to reliably extract and attribute. A single anonymous, unmarked-up page is a weak citation source relative to competitors with structured pricing tables, FAQ schema, and dedicated glossary/explainer pages.

---

## 6. Keyword Targeting & Topical Relevance

Target query set (per brief): *"property management software UAE," "landlord app Dubai."*

Body-text term frequency (homepage only, the only indexable page):

| Term | Count in visible body copy |
|---|---|
| "landlord" | 4 |
| "property management" | 1 (in H1-adjacent tagline area / meta) |
| "Dubai" | **0** in visible body copy (only appears in an image filename `dubai-skyline.webp` and in the `<meta name="description">`) |
| "UAE" | **0** in visible body copy |
| "RERA" / "DLD" | **0** on the marketing page (only appears on the *authenticated login screen*, which is not part of the crawlable marketing funnel and returns via a broken robots.txt/sitemap.xml redirect) |
| "software" | 0 |
| "app"/"application" | 0 (product is called an "assistant") |

Title tag: `Mulak — Property Management` (28 characters) — no location modifier, no "software," no "AI," no "landlord," no "Dubai/UAE." Weak for local-intent queries.

Meta description: `Property management dashboard for Dubai portfolio` (51 characters) — under-length (Google typically renders ~150–160 chars), no compelling CTA, and doesn't mention "landlord," "UAE," "AI," or "software" either.

**Assessment:** For a product whose entire brief/positioning is "AI property-management assistant for landlords, UAE/Dubai market, bilingual EN/Arabic," the actual crawlable marketing copy under-indexes the exact terms prospects and search engines would use to find it. "Dubai" and "UAE" are present only in metadata/image filenames, never in prose a search engine treats as primary body content. There is no keyword stuffing risk (the opposite problem exists — under-optimization for the core local + category terms).

---

## 7. Content-Marketing Surface (Blog/Resources/Help)

**None exists.** `/blog`, `/resources`, `/help`, `/docs`, `/faq` all resolve to the identical homepage. There is no top-of-funnel content strategy: no glossary of UAE tenancy terms, no guides ("How to track post-dated cheques in Dubai," "RERA compliance checklist for landlords"), no comparison content, no customer stories. This forecloses:
- Long-tail organic acquisition entirely (zero non-homepage indexable URLs).
- Any realistic AI-citation surface beyond the single landing page.
- Any topical-authority signal to Google for the "property management UAE" cluster — a single page cannot demonstrate comprehensive topical coverage regardless of how well it's written.

---

## Summary Scorecard

| Dimension | Score | Weight/Note |
|---|---|---|
| Experience | 15/100 | 20% of E-E-A-T |
| Expertise | 20/100 | 25% of E-E-A-T |
| Authoritativeness | 10/100 | 25% of E-E-A-T |
| Trustworthiness | 5/100 | 30% of E-E-A-T |
| **E-E-A-T composite** | **12/100** | weighted |
| Homepage prose quality (`content_quality.py`) | 89/100 | writing mechanics only, no filler/AI-pattern flags |
| Readability (Flesch Reading Ease) | 45.9 | "difficult," acceptable for B2B SaaS |
| Content depth vs. page-type minimums | Homepage passes; every other page type fails (does not exist) | |
| Thin content | Homepage not thin; 10 other tested paths are exact-duplicate, not unique | |
| AI citation readiness | ~15/100 | no schema/OG/canonical/FAQ |
| Keyword targeting for "UAE/Dubai + property management/landlord" | Weak | 0 mentions of "Dubai"/"UAE" in body copy |
| Content-marketing surface (blog/help/resources) | Absent | |

## Overall Content Quality Score: **28/100**

Justification: the words that exist on the one real page are well-crafted, specific, and free of AI-slop/filler patterns (89/100 on mechanical quality) — this prevents the score from being near-zero. But content quality per Google's Sept 2025 QRG is fundamentally gated by E-E-A-T and topical completeness, both of which fail severely: no Privacy Policy/Terms (a Trust-defining omission for a data-handling fintech-adjacent product), no About/team/founder content, no authoritativeness signals, no blog/help surface, no schema/structured data, and near-zero targeting of the core "UAE/Dubai" local-intent terms in indexable prose. The site currently reads as an MVP/pre-launch landing page rather than a market-ready SaaS marketing site, and several footer "pages" are placeholder links that were never wired up — a state that materially undermines trust for prospects doing due diligence on a product that will hold their tenants' financial and personal data.

---

## Top Issues (ranked)

1. **[Critical]** No Privacy Policy or Terms of Service page exists anywhere on the site — both footer links are bare `mailto:hello@mulak.app`. For a product handling landlord/tenant financial data and PII in the UAE (PDPL exposure), this is a severe trust and likely legal-compliance gap, and it also blocks listing in app stores/ad platforms that require a hosted policy URL.
2. **[Critical]** `robots.txt` and `sitemap.xml` do not serve valid files — both 307-redirect into the authenticated app's `/login` screen. Googlebot cannot read crawl directives or discover a sitemap, which suppresses discovery/indexing of any future pages.
3. **[High]** The site is functionally a single page. Footer links for About, Careers, Contact, Blog, Security, and Data Residency are anchors (`#how`, `#features`) or mailto stubs, not real pages — zero content-marketing surface, zero dedicated product/pricing/security pages, and any of the ~10 tested "pages" that do return HTTP 200 (`/about`, `/blog`, `/privacy`, `/terms`, `/careers`, `/help`, `/docs`, `/resources`, `/faq`, `/ar`) serve byte-identical homepage content — a duplicate-content/soft-404 risk if indexed.
4. **[High]** Zero E-E-A-T authority signals: no schema.org markup, no OG/Twitter cards, no testimonials/case studies, no founder/team bios, no press mentions, and social links are non-functional placeholders (`x.com/`, `linkedin.com/`, `wa.me/` with no handle/number). The one compliance claim that exists ("RERA · DLD compliant") is buried on the post-signup login screen, not on the public marketing page where it would build pre-signup trust.
5. **[Medium]** Weak keyword targeting for the site's own core positioning: "Dubai" and "UAE" appear zero times in visible homepage body copy (only in an image filename and the meta description), "RERA"/"DLD" never appear on the marketing page, and the title tag ("Mulak — Property Management") omits location, "software," and "AI" — undermining local-intent and category-intent search relevance despite the product being explicitly UAE/Dubai-focused. (Lower severity than 1–4 because the underlying prose quality is otherwise good — `content_quality.py` overall_quality=89/100, zero filler/AI-pattern flags — so this is a targeting fix, not a rewrite.)

---

## Files/data referenced
- `/tmp/mulak_home.html` — Playwright-rendered homepage HTML (49,333 bytes)
- `/tmp/mulak_home_parsed.json` — `parse_html.py` structured output
- `/tmp/mulak_home_text.txt` — extracted homepage body text (561 words)
- `content_quality.py` output on homepage text: `overall_quality=89`, `filler_score=0`, `ai_pattern_score=0`, `information_density=0.853`, `repetition_score=17`, `tokens=551`
