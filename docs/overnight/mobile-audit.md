# Mobile UX Audit — Baseline (pre-redesign)

Date: 2026-08-12
Site: portfolio (nickwfraser.dev), audited locally against `bun run build` + `bun run preview` (served at http://localhost:4174 — port 4173 was occupied by another node process, so preview auto-bumped; same build, same behaviour).
Method: headless Chrome driven via puppeteer-core over CDP. True mobile emulation (`Emulation.setDeviceMetricsOverride` with `mobile:true`, DPR 3, touch enabled) — NOT `--window-size`, which Chrome clamps. Lazy images were forced by slow section-by-section scrolling before every screenshot.
Widths audited: 360x800, 390x844, 414x896, 430x932 (mobile, DPR 3) + 1440x900 desktop reference (DPR 1).
Screenshots: `docs/overnight/audit-shots/*.png` · Raw measurements: `docs/overnight/audit-tools/results.json`, `results2.json`.

---

## 0. Build baseline (bundle sizes)

`bun run build` (vite v5.4.21, 617 modules, built in 7.95s):

| File | Size | Gzip |
|---|---:|---:|
| dist/index.html | 1.84 kB | 0.86 kB |
| dist/assets/index-Dkr9ZY8k.css | 28.15 kB | 6.40 kB |
| dist/assets/Privacy-CKb6lN2M.js | 2.78 kB | 1.20 kB |
| dist/assets/WorkspaceModel-CrmUvRsC.js | 2.95 kB | 1.46 kB |
| dist/assets/Testimonial-BEmlwDi-.js | 4.87 kB | 2.01 kB |
| dist/assets/Showcase-DvhKpl85.js | 240.92 kB | 78.46 kB |
| dist/assets/index-BoY_a7RZ.js | 261.27 kB | 83.12 kB |
| dist/assets/three.module-D62cJz3Z.js | 732.19 kB | 189.61 kB |

Vite warning: "Some chunks are larger than 500 kB after minification" (three.module).
Good news verified by network capture at 390px: **on a mobile viewport only `index-BoY_a7RZ.js` (261 kB / 83 kB gzip) is fetched** — three.module, WorkspaceModel and Showcase chunks never load because the 3D mounts are `display:none` and their IntersectionObservers never fire. The mobile page pays for the main bundle only.

---

## 1. Tap targets @ 390x844 (getBoundingClientRect, CSS px)

Threshold: 44x44 minimum (Apple HIG / WCAG 2.5.8 uses 24px min, 44 recommended). "TOO BIG" = the owner's complaint — quantified against an 844px viewport.

| Element | Size (w x h) | Font | Padding | Verdict |
|---|---|---|---|---|
| `.showcase-tag` "play emberwood" (fixed) | 142.8 x 58.8 | 16px | 10/16/10/14 | Size OK, but **overlaps page content at every scroll position** (see §3) |
| `.nav-brand` "nick /" | 58 x 25.6 | 16px | 0 | **FAIL <44px** (25.6px tall) |
| `.nav-toggle` (hamburger) | 38 x 32 | — | 8px | **FAIL <44px** — the primary mobile nav control is 38x32 |
| `.nav-theme` (theme toggle, menu open) | 32 x 32 | — | 0 | **FAIL <44px** |
| `.nav-link` x5 (menu open) | 326 x 54 | 13px | 16px 0 | Height OK; **13px label in a 54px row** — target fine, type undersized |
| `.hero-link` "arcade…" | 210.1 x 69 | 11px key / 14px val | 12px 18px | **TOO BIG** — 69px tall (8.2% of viewport height) |
| `.hero-link` "github" | 97.8 x 69 | 11/14px | 12px 18px | **TOO BIG** — 69px tall for a one-word link |
| `.hero-link` "linkedin" | 105.3 x 69 | 11/14px | 12px 18px | **TOO BIG** |
| `.hero-link` "cv.pdf" | 95.8 x 69 | 11/14px | 12px 18px | **TOO BIG** |
| `.hero-link--primary` email CTA | 215.6 x 69 | 11/14px | 12px 18px | **TOO BIG** — solid block, 69px |
| `.about-photo-credit` | 280.3 x 22.2 | **9px** | 0 | **FAIL <44px**, 9px font, contrast 3.26:1 (Lighthouse fail) |
| `.proj-row` (whole project card is one `<a>`) x5 | 350 x **749–834** | — | 0 | **ABSURDLY BIG** — each link is ~1 full screen tall; any touch while scrolling risks navigation. Also fails Lighthouse `label-content-name-mismatch` |
| `.cert-card` x3 | 350 x 131.6 | 16px | 20px | OK |
| `.inline-link` "// projects" | 91.1 x 19 | 13.8px | 0 | **FAIL <44px** (19px tall, mid-paragraph) |
| `.contact-email` button | 303 x 70.8 | 18px | 20px 30px | **TOO BIG** — 70.8px tall, 303px wide (78% of viewport width) |
| footer "github" | 45 x 20 | 12.5px | 0 | **FAIL <44px** |
| footer "linkedin" | 60 x 20 | 12.5px | 0 | **FAIL <44px** |
| footer "arcade.nickwfraser.dev" | 165 x 20 | 12.5px | 0 | **FAIL <44px** |
| footer "privacy" | 52.5 x 20 | 12.5px | 0 | **FAIL <44px** |

The size distribution is bimodal and that is the core problem: **CTAs are 59–71px tall while utility targets are 18–32px**. Six primary buttons sit in the 58.8–70.8px band (hero x5 at 69px, contact email at 70.8px, floating tag at 58.8px); every small control (hamburger, theme toggle, footer, credits, inline links) is under 44px. Nothing is in the comfortable 44–56px range.

Owner complaint quantified: one hero pill = 69px = 8.2% of the 844px viewport. The five hero pills + gaps consume ~305px, and together with the 620px meta card the hero runs 900px + 65px nav — **the email CTA is below the fold on every audited device** (`390-hero.png`).

## 2. Typography scale — 390px vs desktop 1440px

| Role / selector | Desktop | Mobile 390 | Scaled? | Note |
|---|---:|---:|---|---|
| body | 17px | 16px | yes (880px query) | fine |
| h1 `.hero-pitch` | 76px | 38px | yes (clamp) | fine; line-height 1.04 |
| `.lead` (about intro) | 22px | 18px | yes (clamp) | fine |
| `.contact-pitch` | 44px | 26px | yes (clamp) | fine |
| h3 `.proj-name` | 30px | **30px** | **NO** | desktop heading size on a 350px column; nearly rivals the 38px h1 |
| `.exp-role` (h3-level) | 21px | **21px** | NO | acceptable but unconsidered |
| `.b-item` (about bullets) | 17.5px | **17.5px** | NO | larger than body text on mobile |
| `.proj-tagline` | 15.5px | 15.5px | NO | ok |
| `.proj-metric dd` | 13.5px | 13.5px | NO | small |
| `.skill-items li` | 14px | 14px | NO | small |
| `.exp-bullets li` | 15px | 15px | NO | ok |
| `.nav-link` | 13px | **13px** | NO | 13px labels inside 54px menu rows |
| `.hero-link-key` | 11px | 11px | NO | 11px on the biggest buttons on the page |
| `.section-num-label` | 14px | 14px | NO | ok as an eyebrow |
| footer | 12.5px | 12.5px | NO | small + 20px targets |
| `.proj-year` (small) | 12px | 12px | NO | ok |
| `.about-photo-credit` | 9px | **9px** | NO | illegible + contrast fail |

Verdict: the three clamp()'d display sizes (h1, lead, contact pitch) scale correctly; **everything else is a fixed desktop pixel value**. The result is compression of hierarchy at 390px: h1 38 → proj-name 30 → exp-role 21 → body 16, while interactive/labels sit at 9–13px. Only two `@media` steps touch type at all (`body 17→16` at 880px); there is no mobile type scale.

## 3. Spacing, hierarchy, decorative elements @ 390

Section metrics (CSS px, 390x844 → 11,085px document = **13.1 screens**):

| Section | Padding top/bottom | Height @390 | Height @1440 | Share of mobile page |
|---|---|---:|---:|---:|
| nav | 0/0 | 65 | 65 | — |
| hero (`#top`) | 112/88 | 900 | 649 | 8.1% |
| about | 60/60 | 1,078 | 546 | 9.7% |
| projects | 92/92 | **4,298** | 2,427 | **38.8%** |
| skills | 92/92 | **1,989** | 791 | 17.9% |
| experience (`#education`) | 92/92 | 1,969 | 1,462 | 17.8% |
| contact | 92/92 | 659 | 566 | 5.9% |
| footer | 40/56 | 192 | 116 | 1.7% |

- Section paddings are the **desktop values unchanged** (92px top+bottom = 184px of dead space between every section on a 390px phone; hero adds 112+88). Shell gutter drops to 20px at ≤520px, which is fine.
- **Hero** (`390-hero.png`): the meta card is three full-width bordered cells stacked (~620px) for three short key-value facts, followed by five 69px pill buttons. One screen of viewport before any scroll shows: nav, floating tag, name line, h1, and the top of the meta card — the CTAs and email are below the fold.
- **Projects** (`390-projects.png`): five desktop two-column rows collapsed to one column; each card is 749–835px (~one full screen per project) — image, year, 30px title, url, tagline, chip row, then metrics forced to a single column (`proj-metrics: 1fr` ≤520) as a long label/value ladder. This is the single largest "condensed desktop" tell.
- **Skills** (`390-skills.png`): the desktop 3-col grid goes 2-col ≤880 then 1-col ≤520, producing a **1,989px single-file list of ~25 one-word items** ("TypeScript", "Pages", "D1", "Git", …) each on its own generously-spaced row. Enormous scroll cost, zero scanning benefit.
- **Contact** (`390-contact.png`): portrait photo (~470px block) stacked above the pitch, then the 303x70.8 email button; trailing whitespace below.

Decorative / background elements at 390 (computed style + visual check):

| Element | Desktop | @390 computed | @390 visual | Reads as |
|---|---|---|---|---|
| Hero contour shader canvas `.hero-shader` | visible, animated | `display:block`, 390x899, WebGL context live, **rAF 60fps** | **near-invisible** — faint contour lines only detectable in the flat cream expanse | Squeezed leftover: pays full runtime cost, delivers no visible texture |
| Retro computer 3D `.hero-computer` | visible top-right | **`display:none`** (≤1099px) | gone | hidden |
| Parcel box 3D `.contact-box` | visible in contact | **`display:none`** (≤1099px) | gone | hidden |
| Workspace 3D rail `.exp-model-rail` | visible in experience | **`display:none`**; component not even mounted (three.js never fetched) | gone | hidden |
| Sticky notes x3 `.sticky-note` | visible beside projects | zero-size — parent `.proj-note` is `display:none` (≤640px) | gone | hidden |
| Project margin notes `.proj-note` x3 | visible | **`display:none`** (≤640px) | gone | hidden |
| Nav status "open to roles and work" | visible | **`display:none`** (≤880px) | gone | hidden |
| Section number lines/labels `.section-num` | visible | visible (350x22) | reads fine | intentional |
| Footer gradient strip | visible | visible | intentional | intentional |
| Floating `.showcase-tag` "play emberwood" | top-right below nav, clear of content | `position:fixed`, 142.8x58.8, flush against the right viewport edge | **overlaps the hero name line ("nicholas w. fraser · brisba…" is hidden behind it) and floats over section content in every screenshot** (`390-hero.png`, `390-about.png`, `390-contact.png`, `390-skills.png`) | **Broken** — collides with content, zero right margin |

Net effect: **every personality element except the section rules is either hidden or invisible at phone widths** — the exact "background detail lost" complaint. Mobile gets the desktop's information skeleton with the charm amputated, plus one fixed tag that actively collides with content.

## 4. Horizontal overflow

`document.scrollingElement.scrollWidth` vs `window.innerWidth`:

| Width | scrollWidth | innerWidth | Overflow |
|---|---:|---:|---:|
| 360 | 360 | 360 | **0 — none** |
| 390 | 390 | 390 | **0 — none** |
| 414 | 414 | 414 | **0 — none** |
| 430 | 430 | 430 | **0 — none** |

No horizontal overflow at any audited width. (The `.showcase-tag` sits flush at x=390 with zero margin but does not overflow.)

## 5. Scroll performance (CPU throttled 4x, 390x844)

Programmatic full-page scroll over 6s with rAF frame-interval sampling, `Emulation.setCPUThrottlingRate: 4`:

| Metric | Value |
|---|---|
| Effective FPS during scroll | **60.1** |
| avg / p50 / p90 / p99 frame | 16.6 / 16.7 / 17.4 / 18.6 ms |
| Worst frame | 24.8 ms |
| Frames > 33ms / > 100ms | 0 / 0 |
| Idle at hero, 4x throttle | 60 fps |

No jank measurable on this machine even at 4x throttle (caveat: host is a fast desktop; 4x is not a low-end phone). Composition is cheap because all 3D is `display:none` and three.js never loads on mobile (verified: only `index-*.js` fetched).

The one perf smell: **the hero shader runs a WebGL rAF loop at a locked 60fps whenever the hero is on screen** (canvas backing 409x944, i.e. internally DPR-capped to ~1.05x — good), despite being visually undetectable at this size. On a real phone that is pure battery/thermal cost for nothing the user can see. It does pause off-screen/hidden-tab per its own code comments.

## 6. Lighthouse mobile baseline

`bunx lighthouse http://localhost:4174` (default mobile emulation, headless=new; reports: `docs/overnight/lighthouse-baseline.report.{html,json}`. Note: the CLI exits 1 on Windows due to an EPERM cleaning its temp profile — the audit itself completed and both reports were written.)

| Category | Score |
|---|---:|
| Performance | **79** |
| Accessibility | **94** |
| Best Practices | **100** |
| SEO | **100** |

| Metric | Value |
|---|---|
| FCP | 2.6 s |
| **LCP** | **4.2 s** (element: `h1.hero-pitch` — render delay 2,486 ms of it) |
| TBT | 10 ms |
| CLS | 0 |
| Speed Index | 4.7 s |
| TTI | 4.3 s |

LCP is JS-bound, not image-bound: the SPA paints nothing until the 261 kB (83 kB gzip) main bundle parses and React renders, then the h1 waits out its `fade-up` transition-delay (0.18s) — 2.5s of the 4.2s LCP is pure element render delay. TBT/CLS are excellent.

Accessibility failures (94): `color-contrast` (`.about-photo-credit`, 3.26:1 at 9px), `landmark-one-main` (no `<main>`), `label-content-name-mismatch` (`.showcase-tag` and all five `.proj-row` links — accessible name doesn't match visible text).

## 7. Verdict — top 10 problems making this "a condensed desktop page"

1. **Oversized CTAs — the owner is right.** Five hero pills at 69px tall (12+18px padding around 11px/14px text) and a 303x70.8 email button; every primary button is 59–71px tall, 1.5–1.6x the 44px standard, 8%+ of viewport height each. Evidence: §1 table, `390-hero.png`, `390-contact.png`.
2. **The fixed "play emberwood" tag collides with content.** 142.8x58.8, `position:fixed`, flush against the right edge; it covers the hero name line and floats over about/skills/contact text at all scroll positions. Also a Lighthouse a11y fail. Evidence: `390-hero.png`, `390-about.png`, `390-contact.png`.
3. **All background personality is amputated on mobile.** 3D computer, parcel box, workspace rail, 3 sticky notes, 3 margin notes, nav status: all `display:none`; the one survivor (hero shader) is visually undetectable at 390px while still burning a 60fps WebGL loop. Mobile is the desktop minus its charm. Evidence: §3 decorative table, compare `desktop-1440-top.png` vs `390-hero.png`.
4. **13.1-screens-tall page (11,085px @390)** with desktop section paddings (92/92) kept verbatim — 184px of blank space at every section seam. Evidence: §3 table, `full-390.png`.
5. **Projects = 38.8% of the page (4,298px): five collapsed desktop rows, ~one full screen per card**, with metrics forced into a single-column label/value ladder. The archetypal "desktop columns stacked" section. Evidence: `390-projects.png`.
6. **Skills is a 1,989px single-file list of ~25 one-word items** — a 3-col desktop grid collapsed to 1-col instead of redesigned (chips/clusters). Evidence: `390-skills.png`.
7. **Whole project cards are single 350x749–834px `<a>` elements** — a mis-tap anywhere during scroll navigates away; they also fail Lighthouse's accessible-name audit. Evidence: §1, `390-projects.png`.
8. **Small-control tap targets fail 44px across the board**: hamburger 38x32, theme toggle 32x32, footer links 20px tall, photo credit 22px @9px font (also 3.26:1 contrast fail), inline "// projects" 19px. The site's targets are either huge or tiny — nothing sized for thumbs. Evidence: §1 table, `390-nav-open.png`, `390-footer.png`.
9. **No mobile type scale.** Only h1/lead/contact-pitch clamp down; `.proj-name` stays 30px (rivals the 38px h1 on a 350px column), `.b-item` 17.5px outsizes body 16px, while nav links (13px), hero-link keys (11px) and footer (12.5px) stay desktop-small. Hierarchy compresses into a band where headings shout and UI whispers. Evidence: §2 table.
10. **LCP 4.2s / SI 4.7s (Perf 79) on a text hero.** Nothing paints until 261 kB of SPA JS runs; 2.5s of LCP is render delay on `h1.hero-pitch`, worsened by its entrance-animation delay. A static-first hero (or SSR/prerender) would likely put Performance in the 90s. Evidence: §6, `lighthouse-baseline.report.html`.

Secondary notes for the redesign: hero meta card (3 stacked bordered cells, ~620px for 3 facts) is prime real estate to compress; `#education` is the experience section's actual id (nav anchor semantics worth tidying); no `<main>` landmark; no horizontal overflow anywhere (the box model is healthy — the problem is scale and hierarchy, not breakage).

## Appendix: screenshot index (`docs/overnight/audit-shots/`)

- `desktop-1440-top.png` — desktop reference (shader texture, 3D computer, tag clear of content)
- `full-360.png`, `full-390.png`, `full-414.png`, `full-430.png` — full-page at each width (DPR 3)
- `390-nav.png`, `390-nav-open.png` — nav closed/open (menu rows 54px, 13px labels; 32px theme toggle)
- `390-hero.png` — 69px pills, 620px meta card, tag overlapping name line
- `390-about.png` — tag overlapping lead text; photo + 9px credit
- `390-projects.png` — five ~full-screen cards
- `390-skills.png` — single-file skill list
- `390-experience.png` — experience/`#education` section
- `390-contact.png` — 70.8px email button, stacked portrait
- `390-footer.png` — 20px-tall footer links

Raw numbers: `docs/overnight/audit-tools/results.json` (typography, tap targets, spacing, decorative, overflow per width), `results2.json` (scroll perf, shader activity, mobile chunk loading). Audit scripts: `audit.js`, `audit2.js` (same dir).
