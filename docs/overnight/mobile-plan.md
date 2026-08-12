# Mobile redesign plan — plan of record

Written 2026-08-13 (overnight) from `mobile-audit.md` findings. Desktop (>880px)
must be pixel-unchanged; everything below lands inside existing or new mobile
media queries. Verification gates at the bottom are mandatory.

Design intent: not "shrink the desktop" — decide each element's mobile fate
deliberately. Keep the site's personality (mono lowercase labels, warm paper,
amber accent, the sticky-note voice) but rescale the touch/type system for
thumbs and a 390px column. Owner-taste guardrails (from prior review rounds):
no decorative strips, no aggregate stats that say nothing, notes must say what
the card does not, no new colour blobs.

## 1. Touch-target scale (audit §1 — the bimodal size problem)

At ≤640px:
- **Hero links**: kill the two-line pill layout. Email stays the single
  primary: full-width, one line, ~50px tall. The other four (arcade, github,
  linkedin, cv.pdf) become a 2×2 grid of one-line compact buttons (~46px tall,
  15px value text; the `→ key` eyebrow line is hidden on mobile). Band drops
  from ~305px to ~150px and everything is thumb-sized.
- **Contact email button**: padding 14px 20px, font 17px → ~50px tall,
  width fits content (max 100%).
- **Small controls up to ≥44px**: nav hamburger and theme toggle get padding
  boxes to 44×44 (visual glyph size unchanged); footer links get 12px vertical
  padding; `.about-photo-credit` moves to 10px with a colour that passes 4.5:1
  (keep it quiet, not invisible — it is a CC licence requirement, must stay).
- **Whole-card project links stay** (browsers cancel click on scroll gestures;
  not a real mis-tap hazard) but fix the Lighthouse `label-content-name-
  mismatch`: drop the `aria-label` overrides on `.proj-row` and `.showcase-tag`
  and let visible content name them (add visually-hidden "opens in new tab"
  suffix if wanted).

## 2. The floating "play emberwood" tag (audit §3 — collides with content)

At ≤880px: restyle as a compact bottom-right floating chip (single line,
"play emberwood ↗", ~40px tall, 12px from right and bottom edges +
safe-area insets, full rounded corners). Bottom-right is conventional FAB
space; it no longer covers the hero name or body text. Desktop unchanged.

## 3. Personality: deliberate per-element mobile decisions (audit §3)

| Element | Mobile fate | Why |
|---|---|---|
| Hero contour shader | **Keep, static frame** at ≤880px: draw once at alpha ≈ 0.18 with the mask retuned for portrait (current 105° gradient hides most of a narrow screen), no rAF loop | Texture returns, battery cost drops to zero |
| Retro computer / parcel box / workspace 3D | **Stay hidden** | Genuinely no room; squeezing them is the "condensed desktop" smell |
| Sticky notes (Itemate / Emberwood / MvM live) | **Return in-flow**: small un-rotated sticky-style chip between tagline and stack chips inside the card body (not absolutely positioned). Same palette tokens, same content. MvM keeps the live fetch | These are content, not decor — the owner rewrote them so each says what the card doesn't. Mobile currently loses them entirely |
| Nav status "open to roles and work" | Show inside the open mobile menu as a footer line | Signal worth keeping, costs nothing |
| Section numbers/rules, footer gradient | Keep as-is | Already read as intentional |

## 4. Density and rhythm (audit §3/§7 — 13.1 screens → target ≤9.5)

At ≤640px:
- Section padding 92 → **56px**; hero 112/88 → 96/56.
- **Hero meta card**: 3 stacked bordered cells (~620px) → single bordered card
  with 3 compact key/value rows (key and value on one line, ~44px per row,
  ~150px total).
- **Projects** (4,298px → target ≈2,800px): media height ~160px (was 220 min);
  `.proj-name` 21px; tagline 14.5px; metrics return to a 3-across row (values
  are short); body padding 22px 20px; per-card target ≈550px.
- **Skills** (1,989px → target ≈750px): at ≤640px each group's `<ul>` becomes a
  wrap row of chips (existing `.proj-stack-chip` styling vocabulary), groups
  keep their colour-dot headers, certs stay cards.
- **Contact**: portrait 110px beside the pitch (two-column stays until ~430px
  instead of stacking a ~470px photo block), then email button.
- Safe-area: `env(safe-area-inset-*)` padding on nav and footer.

## 5. Type scale at ≤640px (audit §2 — no mobile scale exists)

| Selector | Desktop | Mobile |
|---|---|---|
| `.proj-name` | 30 | **21** |
| `.exp-role` | 21 | 19 |
| `.b-item` | 17.5 | 16 |
| `.nav-link` (menu rows) | 13 | **15** |
| `.hero-link-val` | 14 | 15 |
| footer | 12.5 | 13 |
| `.about-photo-credit` | 9 | 10 + contrast fix |
| `.proj-metric dd` | 13.5 | 14 |

h1/lead/contact-pitch clamps already behave — leave them.

## 6. Performance / a11y touch-ups (audit §5/§6)

- Shader static-frame change above removes the only mobile rAF loop.
- At ≤880px the hero `.fade-up` entrance starts visible (no delay chain in
  front of the LCP h1). Desktop entrance unchanged. (Real LCP fix is
  prerender/SSG — out of scope tonight, noted in MORNING-REVIEW.)
- Add `<main>` landmark (done at integration, App.jsx is another lane's file).
- Fix the two `label-content-name-mismatch` sources (§1).
- Everything respects `prefers-reduced-motion` as today.

## 7. Verification gates (all mandatory before hand-back)

1. `bun run build` green; CSS-size delta noted; main JS chunk byte-identical
   expectation: no JS changes should alter it beyond components.jsx edits.
2. **Desktop non-regression**: 1440×900 full-page screenshot diffed against
   `audit-shots/desktop-1440-top.png` — allowed diffs: none (animations aside).
3. Mobile screenshots at 360/390/414/430 (same CDP emulation recipe as the
   audit; port 9555, own profile dir) → `docs/overnight/redesign-shots/`.
4. Re-measure the §1 tap-target table — every listed element 44px+ or
   documented why not; no element >56px tall except the h1.
5. Document height at 390 ≤ 9.5 screens; horizontal overflow still zero at all
   four widths.
6. Sticky-note chips verified visible at 390 in light AND dark theme.
