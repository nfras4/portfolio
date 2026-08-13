# MORNING-REVIEW.md — overnight session 2026-08-13

> **ADDENDUM — day session 2026-08-13 (uncommitted on top of the 6 commits).**
> Nick-directed expansion, all working-tree only:
>
> **Mobile layout:** the three 3D models now SHOW on mobile (retro computer
> in-flow at hero top, workspace wireframe under the Tek Monkeys bullets,
> parcel box after the contact CTA — `ContactBox` moved to end of section in
> JSX; desktop unaffected, it's absolutely positioned there). Hero shader
> ANIMATES on mobile again (reverses overnight's static-frame battery call —
> one line in `HeroShader.jsx` to flip back). Chasing its invisibility found
> a real bug: **StrictMode's dev double-mount permanently killed the WebGL
> context** (`loseContext()` in cleanup, remount gets the dead context back).
> Fixed with full context-loss recovery — stash the `WEBGL_lose_context` ext
> while healthy (getExtension returns null once lost), a persistent
> `preventDefault` guard on `webglcontextlost` (restore is refused without
> it), and a deferred retry (the lost event dispatches AFTER cleanup→effect).
> Recovery also covers real GPU context drops on phones.
>
> **SEAM expansion (DUAL! homage deepened, per the dossier's ship-framework
> pattern):**
> - **Ammo economy** — per-fighter pool + regen, tap costs 1, charge up to 3,
>   charge ring honestly caps at what ammo affords, dry-fire click + flash,
>   diamond pips HUD.
> - **Three fighters** (`engine/fighters.js`): dart (single bolt / heavy
>   slug), swarm (3-fan / 5-fan curved, quick ship, ammo 4), orb (slow
>   2-bounce heavy / SEAM-BREAKER that splits into 3 at the seam, weighty
>   ship). All bullet motion deterministic from spawn params (ax curve,
>   bounce budget, split flag) — no live homing, both sims stay identical;
>   split verified mirror-consistent in a bun harness.
> - **Fighter select** phase (online: pick + lock in, host starts when clock
>   sync AND both fighters land; AI: pick + difficulty + fight). Rematch
>   keeps fighters.
> - **2D movement** — ship roams its own half (y ∈ [0.06, 0.6]), touch drag
>   is 2D, state packet now 23 bytes (x, y, vx, vy, charge). Opponent ghost
>   tick scales with THEIR seam proximity (big tick = shots arrive sooner).
> - **Tilt controls** — DeviceOrientation steering (DUAL!'s confirmed input),
>   ±22° range, neutral auto-calibrated at each round's "go", iOS permission
>   via the tilt chip tap, touch stays as fallback/default without a sensor.
>   ⚠ NEVER tested with a real gyro — beta/gamma signs may need flipping on
>   a real phone; check first.
> - **vs the machine** (`engine/bot.js`) — local AI: a full mirrored sim as a
>   headless second client (reuses the exact netplay sim/spawn path), dodge/
>   stalk/trigger-discipline brain, three difficulties (breezy/even/ruthless).
>   The dossier notes a solo mode was DUAL!'s most-requested missing feature.
> - e2e updated for the select phase — **ALL PASS p2p + relay** post-change
>   (run from `docs/overnight/audit-tools/`, copy e2e.mjs beside its
>   node_modules). `seam-live.mjs` there launches two visible windows for
>   one-human testing. AI difficulty balance is untested by a human.
> - **HP model** (Nick: one-tap kills made charging pointless): 3 HP per
>   round, chip damage — dart charged slug 2, orb slam 2 (split children 1),
>   swarm darts 1. State packet 24 bytes (hp u8), `hurt` event for instant
>   shooter feedback, HP bars both corners, hurt blink + lighter sfx.
> - **Desktop play**: /seam's desktop QR gate is GONE — full menu on desktop,
>   arrows/WASD move, space charges/fires, arena constrained to a centered
>   phone-proportion column. Desktop can host a duel a phone joins by QR.
>
> **Round 3 (2026-08-13, uncommitted): the arcade dress-up.** Clicking the
> hero computer dives INTO its screen (overlay grows from the CRT's rect,
> computer swings face-on, /seam boots with a power-on flash); nick/ ×5 now
> works with mouse clicks too, same boot. SEAM wears a full CRT filter:
> canvas backing at 0.45× with nearest-neighbour upscale (PIXEL_SCALE in
> render.js), scanlines + aperture grille + vignette + phosphor breathe
> (.seam-crt), reduced-motion safe. ⚠ the boot animation scales the root, so
> the canvas measured mid-boot was 2px tall — the frame loop now self-heals
> size every 500ms. ⚠ verification traps hit twice: isolated-world probes
> can't see main-world CSSOM writes OR pump rAF — trust console.log from the
> real code path, not evaluate reads. ⚠ an orphaned vite held :5173 serving
> stale transforms after a kill — check the dev-server port banner.
>
> **DEPLOYED 2026-08-13**: `seam-signal` worker LIVE at
> `seam-signal.nickwfraser-b09.workers.dev` (URL now real in signal.js), site
> deployed to production (`7c6fba7d` deployment). Boot-verified on
> nickwfraser.dev: mobile hero + models, /seam host QR against the live
> worker, an AI round on mobile touch AND desktop keys, orb seam-split with
> ammo drain. ⚠ **ALL OF THIS IS STILL UNCOMMITTED** — production now serves
> code that exists only in this working tree. Commit before touching anything.

Branch: **`overnight/mobile-dual`** (6 commits on top of `409cfeb`). Nothing
pushed, nothing deployed, `main` untouched. `DECISIONS.md` has every judgement
call; research/plans/evidence live in `docs/overnight/`.

```
8dd8af3 docs: overnight research + SEAM game architecture plan
b6df56b docs: mobile baseline audit + redesign plan
972dc6f feat: SEAM — hidden two-phone 1v1 duel at /seam (lazy, mobile-only)
62faefa feat: mobile-first layout redesign (360-430px), desktop pixel-frozen
035ec18 feat: SEAM discovery gesture, main landmark, a11y name fix, console hint
(+ this review / DECISIONS / final QA artifacts commit)
```

## TL;DR results

| Metric (mobile 390px) | Before | After |
|---|---|---|
| Page height | 11,085px (13.1 screens) | 8,722px (10.3 screens) |
| Primary CTAs | 59–71px tall | 44–56px band |
| Failing (<44px) tap targets | 9 elements | 0 |
| Lighthouse | 79 / 94 / 100 / 100 | **80 / 100 / 100 / 100** |
| LCP | 4.2s | 4.0s |
| Desktop 1440px pixel diff | — | 0.228%, all inside the animated hero |
| Main bundle | 83.1 kB gz | 83.5 kB gz (route wiring) |

And the big one: **SEAM**, a hidden two-phone duel (DUAL! homage) at `/seam` —
QR pairing, WebRTC with automatic relay fallback, verified end-to-end in
automation on both transports (full match to a scored hit on two emulated
phones). Its lazy chunk is 16 kB gz; the page costs nothing until opened.

## How to test on your phone (branch, local)

```
git checkout overnight/mobile-dual && bun install
bunx wrangler dev --config worker/seam-signal/wrangler.jsonc --ip 0.0.0.0 --port 8787
bun run dev -- --host          # second terminal
```
Phone on the same Wi-Fi → `http://<your-LAN-IP>:5173`.

1. **Mobile redesign**: just browse. Things to judge: hero button grid,
   compact meta rows, ~half-height project cards with the sticky notes now
   in-flow under each tagline, skills as chips, the "play emberwood" chip
   bottom-right, static (non-animated) contour texture in the hero. Toggle
   dark mode too.
2. **SEAM**: tap the **`/` in "nick/" five times** (or go to `/seam`). Host a
   duel → QR appears → scan with a second phone on the same Wi-Fi → 3-2-1 →
   play. Drag anywhere to move, tap to shoot, hold to charge. First to 5.
   The tiny badge shows `p2p` or `relay`. (In dev the QR encodes your LAN IP
   automatically.)
3. **Desktop check**: open the site at full width — it should look exactly as
   it did yesterday.

## To take SEAM live later (two steps, ~5 min)

1. `bunx wrangler deploy --config worker/seam-signal/wrangler.jsonc`
2. Put the deployed URL into `SIGNAL_URL` in `src/game/net/signal.js`
   (the `PLACEHOLDER` line, marked TODO) → build & deploy the site as usual.

Optional upgrade for hard cellular NATs: Cloudflare Realtime TURN (free 1TB/mo)
— needs a credential-minting endpoint; steps in
`docs/overnight/connectivity-research.md` §2. Until then those pairs
automatically use the Durable Object relay (~40–100ms, playable).

## What I'd like your eyes on (ranked)

1. **Sticky notes in-flow on mobile cards** — I brought them back as content
   (your round-6 rule: a note says what the card doesn't). If they read as
   clutter at 390px, reverting is one CSS block
   (`.proj-note` in `flair.css` ≤640px) + one JSX move.
2. **SEAM feel numbers** — bullet speed (~1.7s full crossing), charge curve,
   first-to-5. All my tuning, flagged in `DECISIONS.md` D16. Real-device play
   will tell you more in 2 minutes than any of my automation.
3. **The emberwood chip bottom-right** — better than covering the hero name,
   but you may prefer it gone entirely on phones.
4. **Page height is 10.3 screens, not the planned ≤9.5** — the remainder is
   real content (venue descriptions, campus photo). Options logged in
   `docs/overnight/redesign-log.md`; cutting content was your call, not mine.
5. **Console hint text** ("the slash counts to five") — easy to remove/change
   in `src/main.jsx` if too cute.

## Known gaps / honest caveats

- **Never tested on real phones.** All verification is emulated (CDP device
  metrics, touch events, two headless Chromes). iOS Safari WebRTC and wake
  lock especially want a real-device pass — the transport auto-falls-back to
  relay if negotiation fails, so worst case is a laggier duel, not a broken one.
- Rematch, disconnect overlay, and first-to-5 completion are implemented and
  code-reviewed but the automated match stops after the first scored hit.
- The worker origin allowlist covers nickwfraser.dev, *.pages.dev previews,
  localhost and LAN IPs — custom domains beyond that need a line in
  `worker/seam-signal/src/index.js`.
- Perf 80 is JS-bound (SPA renders the hero after 83 kB gz of JS). The real
  fix is prerender/SSG — deliberate follow-up, see DECISIONS D9.
- Easter eggs shipped: SEAM + 5-tap gesture + console hint. I stopped there
  on purpose (DECISIONS D18) — quality over quantity given your history of
  deleting decorative extras.

## Where everything is

- `DECISIONS.md` — all 18 decisions + accepted risks
- `docs/overnight/dual-game-research.md` — DUAL! mechanics dossier (sourced)
- `docs/overnight/connectivity-research.md` — transport/signaling research
- `docs/overnight/dual-architecture.md` — SEAM plan of record
- `docs/overnight/mobile-audit.md` + `audit-shots/` — measured baseline
- `docs/overnight/mobile-plan.md` — redesign plan of record
- `docs/overnight/redesign-log.md` + `redesign-shots/` — build log, before/after
- `docs/overnight/seam-build-log.md` — game build log
- `src/game/__tests__/e2e.mjs` — the two-phone automated match (needs
  puppeteer-core; also `docs/overnight/audit-tools/tap-test.mjs` for the
  gesture)
- Lighthouse: `lighthouse-baseline.report.html` → `lighthouse-final.json`
