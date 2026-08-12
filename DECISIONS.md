# DECISIONS.md — overnight session 2026-08-13

Every judgement call made while you slept, with reasoning. Full research and
plans live in `docs/overnight/`. Anything here is a draft decision — veto
freely in the morning.

## Process

- **D1. One branch, `overnight/mobile-dual`.** All work is commits on this
  branch; `main` untouched; nothing pushed; nothing deployed. Started from
  clean `409cfeb`.
- **D2. Research before code.** Three parallel lanes (DUAL! mechanics dossier,
  connectivity research, mobile baseline audit) ran and were committed before
  any implementation. Plans of record: `docs/overnight/dual-architecture.md`
  and `docs/overnight/mobile-plan.md`.
- **D3. Two build lanes with hard file territories** (mobile: styles/flair/
  components; game: src/game + worker + route line in App.jsx) so neither can
  clobber the other. Agents don't commit — every diff gets reviewed first.

## Task 1 — mobile redesign

- **D4. Desktop is pixel-frozen.** Every change is media-query-gated ≤880px or
  provably desktop-identical. The build lane must pixel-diff a 1440px
  screenshot against baseline before handing back. Two deliberate exceptions,
  both Lighthouse accessibility fails visible on desktop: the photo-credit
  contrast fix and the aria-label/name-mismatch fixes.
- **D5. Fix the bimodal target scale, not just "shrink buttons".** The audit
  shows CTAs at 59–71px while every utility control is under 44px. Mobile
  target band: 44–56px for everything. The five two-line hero pills become
  email full-width + a 2×2 one-line grid; the eyebrow "→ key" labels hide on
  mobile.
- **D6. "play emberwood" tag becomes a bottom-right chip on mobile.** At 390px
  the fixed tag was covering the hero name line and floating over body text —
  the audit's clearest "reads as broken" finding. Bottom-right FAB position is
  the conventional safe slot. Desktop unchanged.
- **D7. Per-element personality decisions on mobile** instead of blanket
  display:none: shader stays as a **static** contour frame (visible texture,
  zero rAF/battery cost — it was running 60fps WebGL for an invisible effect);
  3D models stay hidden (no room, and squeezing them is the exact "condensed
  desktop" smell); **sticky notes come back in-flow inside the project cards**
  — they're content, not decoration (each says what the card doesn't, your
  round-6 rule), and mobile was losing them entirely.
- **D8. Density: section padding 92→56, hero meta card compacted, project
  cards ~550px, skills become chips.** Target: 13.1 screens → ≤9.5 at 390px
  with zero content removed. Type gets a real mobile scale (proj-name 30→21
  being the big one).
- **D9. LCP band-aid only tonight.** Mobile skips the load-time `.fade-up`
  hidden-start so the h1 isn't waiting on an entrance animation; the real fix
  (prerender/SSG — LCP is 4.2s because nothing paints before 261kB of JS) is
  scoped as a follow-up, not rushed at 3am.

## Task 2 — the two-phone game

- **D10. Name: SEAM.** The homage is named for its core moment — the bullet
  crossing the physical seam between two phones. Skin is the site's own design
  system (amber vs sky ships, mono lowercase UI, warm paper/dark themes) —
  clearly original, zero asset/branding overlap with DUAL!.
- **D11. Route `/seam`, lazy-loaded, mobile-gated.** Zero bytes in the main
  bundle until opened. Desktop visitors get a "this one needs two phones" card
  with a QR of the page. Discovery gesture: 5 quick taps on the nav-brand `/`
  on a touch device (wired at integration), plus a console hint.
- **D12. Touch-drag movement, not tilt.** The original is tilt-based, but iOS
  requires a permission prompt for DeviceOrientation which would wreck the
  scan-and-play flow. Drag-anywhere is the deliberate browser adaptation; tilt
  is a possible later option.
- **D13. WebRTC DataChannel primary, Durable Object relay fallback, STUN only
  tonight.** Web Bluetooth is formally infeasible (no peripheral role in the
  spec; no iOS support) — researched and closed. Cloudflare TURN needs
  account-side credential minting (production work), so hard-NAT pairs ride
  the DO relay (~40–100ms one-way, fine for casual duels). TURN upgrade steps
  are in MORNING-REVIEW.
- **D14. Signaling worker lives in-repo at `worker/seam-signal/`** (own
  wrangler.jsonc, deployable standalone), modeled on impostor's hibernating
  room DO — so the whole night is reviewable on one branch. NOT deployed;
  client carries a clearly-marked placeholder URL until you deploy.
- **D15. Authority split: each phone owns its own ship and its own death**
  (announces "I got hit"; no dispute path), shooter owns bullet spawns, host
  referees round/match state. Same shape as the Emberwood co-op seam rule —
  one side owns the outcome, the body's owner does the arithmetic.
- **D16. Rules chosen where research hit walls** (the original's numbers
  aren't documented anywhere reachable): one-hit rounds, first-to-5, 3-2-1
  synced countdown, charge 0→1 over 900ms scaling speed/size, ~1.4s uncharged
  seam-crossing time, one side-wall bounce, faint opponent "ghost" tick at the
  seam. All flagged as our tuning, not copied facts.
- **D17. DUEL mode only tonight** — a working vertical slice (pair → play →
  score → rematch) beats three broken modes. DEFEND/DEFLECT and ship variants
  are architecture-compatible follow-ups (the spawn protocol already carries a
  `kind` field).

## Task 3 — other easter eggs

- **D18. Kept minimal deliberately** given your track record of removing
  decorative extras on sight: a console message for dev-tools visitors and the
  5-tap SEAM discovery gesture double as the "other" easter eggs. No confetti,
  no cursor trails, nothing that competes with the site. (If QA time allowed
  nothing more, that's the whole list — see MORNING-REVIEW for what shipped.)

## Known risks accepted tonight

- **R1.** Real two-phone cellular/TURN testing is impossible without deploying
  the worker — validated with two emulated clients + forced-relay instead.
- **R2.** iOS Safari WebRTC quirks can only truly be tested on a real iPhone —
  the transport falls back to relay automatically if negotiation fails.
- **R3.** The audit's four full-page baseline PNGs are ~7MB each; they're
  committed as evidence. Prune `docs/overnight/audit-shots/full-*.png` if the
  branch feels heavy.
