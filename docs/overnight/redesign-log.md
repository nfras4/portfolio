# Mobile redesign — implementation log

Started 2026-08-12 (overnight). Plan of record: `mobile-plan.md`. Baseline: `mobile-audit.md`.
Territory: styles.css, flair/flair.css, components.jsx, flair/HeroShader.jsx, flair/StickyNotes.jsx.
Build/serve on my own ports: build `--outDir dist-m`, preview :4300, CDP :9555.

## Decisions

- **`dist-m` is NOT gitignored** (`.gitignore` has `/dist` only) → will delete `dist-m/` at the end.
- **`.showcase-tag` markup + its `aria-label` live in `src/App.jsx` — off-limits.** The tag redesign
  (bottom-right chip at ≤880px) is pure CSS so that's fine. The plan's aria-label rewrite for the tag
  cannot be done from my territory. However: the Lighthouse `label-content-name-mismatch` on the tag is
  caused by the visible kicker text "↗ NEW!" not being contained in the aria-label — at ≤880px the
  kicker is `display:none`, so visible text collapses to "play emberwood", which IS contained in
  "Play Emberwood, opens in a new tab" (containment is case-insensitive) → the mobile Lighthouse audit
  should pass without touching App.jsx. **Owner TODO (one line, App.jsx:20):** change to
  `aria-label="play emberwood (opens in a new tab)"` to fix desktop too.
- The five `.proj-row` `aria-label="Open X"` overrides are in components.jsx (mine) → removed; visible
  content names them.
- **Hero arcade link text**: "arcade.nickwfraser.dev" cannot fit a half-width cell at 360–390px (≈150px
  content box). JSX change: wrap the domain suffix as `arcade<span class="hero-link-val-ext">.nickwfraser.dev</span>`
  inside ONE flex item (the val is `inline-flex` with `gap:6px`, so the suffix span must be nested inside
  a wrapper span to avoid introducing a 6px flex gap on desktop). At ≤640px the suffix is hidden →
  button reads "arcade ↗". Desktop renders identically (verified by pixel diff below).
- **Sticky note JSX moved** from before `.proj-year` to after `.proj-tagline` so `position:static` at
  ≤640px lands between tagline and stack chips. On desktop `.proj-note` is `position:absolute` →
  DOM order has no visual effect (verified by desktop pixel diff below).
- **Nav status in menu**: added `<span class="nav-status nav-status--menu">` as last child of
  `.nav-links`; base CSS `display:none`, shown only inside the open menu at ≤880px.
- **Photo credit contrast (desktop-visible change, allowed per plan §1/§5)**: `.about-photo-credit`
  gets `color: var(--muted); opacity: 1` at all sizes (was inherited `--faint` at 0.7 opacity → 3.26:1
  Lighthouse fail). Light `--muted` oklch(0.36 0.05 55) on oklch(0.96 0.015 75) ≈ 7:1 → passes 4.5:1.
  10px font at ≤640px + padding to make it a real tap target.
- **`.nav-link` 15px applied at ≤880px** (not ≤640px as the plan table says): the hamburger menu exists
  from 880px down, and the 15px spec is for menu rows; desktop nav (>880px) untouched.
- **≤520px block cleanup**: removed `.proj-metrics { 1fr }` (plan returns metrics to 3-across) and
  `.proj-body { padding: 28px 24px }` (superseded by 22px/20px at ≤640, and the 520 rule came later in
  the file so it would win). Both rules only ever applied ≤520px → mobile-only change.
- **Contact stacks below 400px** (not 430): at 390px the two-col right column is ~230px but the email
  button needs ~240px; at 414/430 two-col fits. So `auto 1fr` + 96px portrait holds for 414/430,
  single column at ≤400px (covers 390/360).
- **HeroShader**: `matchMedia("(max-width: 880px)")` joins `prefers-reduced-motion` as a static-mode
  trigger; static alpha 0.18 on mobile (vs 0.14 for reduced-motion). Redraws on theme change, resize,
  and mq flips (listener on the mq `change` event). Desktop path is bit-identical: at >880px
  `staticMode = reduced` and alpha = 0.14 as before.

## Results (all against `bunx vite build --outDir dist-m`, served :4300, CDP :9555; dist-m deleted after)

### Gate 1 — build
Green. CSS 28.15 → 30.48 kB (index-*.css 31,213 B on disk; +~2.7 kB of media-query rules).
Main JS 261.27 → 262.07 kB (components.jsx edits only). New `Seam-*` chunks in the build output
belong to the other agent's concurrent lane (src/game/**), not this work.

### Gate 2 — desktop non-regression (1440×900, DPR 1, rotator frozen on the baseline's word)
Pixel diff vs `audit-shots/desktop-1440-top.png`: **0.228% of pixels (2,955 px)**, diff bbox
(262,127)–(1285,540) = the animated hero interior (shader contour field + retro-computer sway).
**Zero diff pixels below y=760** (the about section content in frame is bit-identical).
DOM invariants at 1440 all desktop-original: hero-links `flex`/column with keys visible, arcade text
"arcade.nickwfraser.dev ↗" intact, meta 3-col, `.proj-note` absolute at exactly top 26/right 32,
sticky rotate ≠ 0, skills 5-col plain list (no chips), portrait 158px, tag at top:84/right:0 with
kicker, footer links unpadded. Full-page after shot: `redesign-shots/desktop-1440-after.png`
(the nav strip appearing mid-page in it is the usual fullPage-capture artifact for fixed elements).

### Gate 3 — screenshots
`redesign-shots/`: full-{360,390,414,430}.png, 390-{hero,nav-open,projects,skills,experience,contact,footer}.png,
390-dark-{hero,projects}.png, 360-{hero,contact}.png, desktop-1440-after.png. Raw numbers:
`redesign-tools/results.json` (scripts: desktop-verify.js, mobile-verify.js, spot360.js in redesign-tools/).

### Gate 4 — tap targets @390 (before → after, CSS px)
| Element | Before | After |
|---|---|---|
| `.showcase-tag` | 142.8×58.8 fixed top-right, overlapped content | 162.7×**40.8** bottom-right chip + safe-area insets (plan specced ~40px; documented exception to 44) |
| `.nav-brand` | 58×25.6 | 74×**45.6** |
| `.nav-toggle` | 38×32 | **44×44** |
| `.nav-theme` (menu) | 32×32 | **44×44** |
| `.nav-link` (menu) | 326×54 @13px | 326×**53 @15px** |
| `.hero-link` ×4 | 69px tall, 2-line | 170×**50**, one line @15px, 2×2 grid |
| `.hero-link--primary` email | 215.6×69 | 350×**50** full-width |
| `.about-photo-credit` | 280×22.2 @9px, 3.26:1 | 244×**44** @10px, var(--muted) ≈7:1 |
| `.inline-link` "// projects" | 91×19 | 95×**47** (padding + negative margin, no layout shift) |
| `.contact-email` | 303×70.8 | 262×**55.2** |
| footer links ×4 | 20px tall | **44.8px** tall @13px |
| `.proj-row` ×5 | 749–834 whole-card links | 490–670 whole-card links (kept per plan §1 — scroll gestures cancel clicks) |
Every previously failing element ≥44px except the tag chip (40.8, per plan's own spec);
every previously TOO BIG element now ≤56px (max is contact-email 55.2). Hero meta rows 42–65px.

### Gate 5 — document height & overflow
| Width | Before | After | Screens | scrollWidth |
|---|---:|---:|---:|---|
| 360 | — | 9,050 | 11.3 | 360 = innerWidth ✓ |
| 390 | 11,085 (13.1 scr) | **8,722** | **10.3** | 390 ✓ |
| 414 | — | 8,400 | 9.4 | 414 ✓ |
| 430 | — | 8,292 | 8.9 | 430 ✓ |
Sections @390 (before → after): hero 900→649, about 1,078→952, projects 4,298→3,232,
skills 1,989→1,439, experience 1,969→1,765, contact 659→475, footer 192→210 (taller = tap padding).
**MISSED the ≤8,018 (9.5-screen) target at 390 by ~700px (10.3 screens), −21% vs baseline.**
Why: the plan's §3 personality restoration *adds* ~300px (three in-flow sticky notes) that the
baseline mobile page didn't have, and the remaining ~700px is real content (venue descriptions
≈240px, the campus photo block ≈300px, project taglines) whose removal is an owner call, not an
overnight styling call. Every padding/type lever in the plan's §4/§5 tables has been applied and
then some (section 56px, cards compacted, chips, 96px portrait, photo shrunk to 232×248).
To actually reach 9.5 screens: hide `.venue-desc` at ≤640 (−240), drop the about photo on mobile
(−300), or trim two project taglines — flagged for morning review.

### Gate 6 — shader + notes @390
- rAF calls in 2s with hero on screen: **0** (loop never starts; `matchMedia` static path).
- Two hero screenshots 1s apart: right-edge strip (44×600 CSS px region) **0 differing pixels** — static frame.
- Canvas 409×680 backing store, visible as contour texture in `390-hero.png` / `360-hero.png` (alpha 0.18, 180° portrait mask).
- Theme flip redraw verified implicitly: dark reload shows the amber contour field (`390-dark-hero.png`).
- Sticky notes: `position: static`, `transform: none`, between tagline and stack on all 3 cards, correct
  tones in light AND dark (results.json `notes390` / `dark390`), MvM note live ("ML $11,278 / 🐒 $10,320").
- Menu status line visible in the open menu (`390-nav-open.png`).

### Gate 7 — Lighthouse mobile (:4300)
| Category | Baseline | After |
|---|---:|---:|
| Performance | 79 | **80** |
| Accessibility | 94 | **98** |
| Best Practices | 100 | **100** |
| SEO | 100 | **100** |
FCP 2.6s, **LCP 4.0s** (was 4.2 — the ≤880px preload-fade bypass removed the h1's 0.18s render
delay; the rest is SPA JS, as the plan predicted), TBT 0ms, CLS 0, SI 4.7s.
All three named baseline a11y fails now pass: `color-contrast` ✓, `label-content-name-mismatch` ✓
(proj-row aria-labels removed; the tag's kicker is hidden ≤880 so its visible text is contained),
`target-size` ✓. Only remaining fail: `landmark-one-main` — App.jsx, the other lane's file (plan §6).
Reports: `lighthouse-after.report.{json,html}`. (CLI exits 1 on Windows cleaning its temp profile —
same as the baseline run; reports written fine.)

### Gate 8 — cleanup
Preview server (my child) stopped; `dist-m/` deleted (NOT gitignored — only `/dist` is);
no processes belonging to the other agent touched.

## Deviations from the plan
1. **9.5-screen height gate missed** (10.3 @390) — see Gate 5; needs owner content decisions.
2. **Tag aria-label** not editable (App.jsx); mobile passes anyway via hidden kicker; one-line owner TODO logged above.
3. **`.nav-link` 15px applied at ≤880** (menu breakpoint), not ≤640.
4. **Contact stacks below 400px** (not ~430): the email button (262px) doesn't fit the two-col right column below ~410px viewport; 414/430 keep two columns.
5. **Arcade hero link** shows "arcade ↗" at ≤640 via a nested suffix span (full domain doesn't fit a 2×2 cell at 360); desktop text identical (pixel-diff verified).
6. **Photo credit** color changed at ALL widths (desktop-visible) — explicitly allowed by plan §1 as the contrast fix; hover now goes to var(--text) instead of opacity.
7. Second density pass went slightly beyond the plan's tables (cert/skill-group padding 16px, exp/venue row padding 18/12px, about photo 232×248, section-num margin 32px) chasing the height gate.
