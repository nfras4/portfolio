# SEAM build log

Started 2026-08-12. Agent building hidden two-phone 1v1 duel game per docs/overnight/dual-architecture.md.

## Territory
- src/game/** (new), worker/seam-signal/** (new), src/App.jsx (one lazy route), package.json/bun.lock (qrcode-generator only), this file.

## Log

- [start] Created build log. Next: read plan of record + research docs + impostor room.ts + styles.css/App.jsx baseline.
- [baseline] `bun run build` BEFORE any changes (vite 5.4.21):
  - index.html 1.84 kB (gz 0.86)
  - assets/index-Dkr9ZY8k.css 28.15 kB (gz 6.40)
  - assets/index-BoY_a7RZ.js 261.27 kB (gz 83.12)  ← main bundle
  - assets/Showcase-DvhKpl85.js 240.92 kB (gz 78.46)
  - assets/three.module-D62cJz3Z.js 732.19 kB (gz 189.61)
  - assets/Privacy 2.78 kB / Testimonial 4.87 kB / WorkspaceModel 2.95 kB
- [dep] `bun add qrcode-generator` → 2.0.4. Only new dependency.
- [worker] worker/seam-signal/ written: wrangler.jsonc (name seam-signal, compat 2026-08-08, DO SEAM_ROOM→SeamRoom, migrations v1 new_sqlite_classes), src/index.js (hand-written entry, /room/<id> route with [a-z0-9]{8,64} id check, Origin allowlist prod+localhost+127+LAN 192.168/10/172.16-31), src/room.js (Hibernation API, role tag host/guest by existing tags not socket count, verbatim relay, {"t":"hb"} keepalive swallowed, peer-left on close/error, 10-min idle alarm with lastActivity throttled to 1 write/60s so 30Hz relay traffic doesn't hammer storage; alarm re-arms if activity was recent).
  - Deviation from brief (small): brief said "reject a third" socket — done via 409 before upgrade. Also added webSocketError → peer-left (same as close) and a role message ({t:"role",role}) to each socket on connect so the client doesn't guess.
- [worker-smoke] wrangler dev :8787 + `bun worker/seam-signal/smoke.mjs`: 11/11 PASS (role assignment, peer-joined, JSON verbatim relay, binary verbatim relay incl. ArrayBuffer roundtrip, hb swallowed, third socket rejected, bad origin rejected, peer-left on close). Smoke script kept at worker/seam-signal/smoke.mjs.
- [client] Written: src/game/net/{protocol,signal,transport}.js, src/game/engine/{sim,render,audio}.js, src/game/{Seam.jsx,seam.css,qr.js}. Route /seam added to App.jsx exactly like /showcase (lazy + Suspense). Notes:
  - Coordinate frame: local y∈[0,2] (my half [0,1], seam y=1, opponent half (1,2]); spawns broadcast in shooter frame; receiver mirrors x'=1−x, y'=2−y, v'=−v.
  - INTERPRETATION of "0.55 units/s": read as full-arena units (both halves), so local vy = 1.1 half-units/s → uncharged crossing baseline→baseline ≈ 1.8s (plan's own "~1.4s to cross both halves" is inconsistent with 0.55 over y∈[0,2] = 3.6s, which felt floaty; split the difference toward the plan's crossing-time intent).
  - Transport is a facade that settles once ("p2p"|"relay"); on fallback it sends {t:"use-relay"} so both peers land on the same transport even if their timers race. Fallback triggers: 7s after ICE gathering completes, 10s hard cap, or pc failed.
  - Host = referee: tallies rounds, schedules countdowns (T+3.4s on host clock; guest converts via ping/pong offset, best-of-3 lowest-RTT sample), sends score/end. Each side authoritative for own death only ({t:"hit"} announced, no dispute).
  - ?forcerelay=1 (dev-only) swaps iceServers to TURN-only TEST-NET-1 (unreachable) + iceTransportPolicy relay to exercise the fallback deterministically.
- [build] `bun run build` green. dist/assets: Seam-B9ZHeP2A.js 43.39 kB (gz 15.95) + Seam-Cg6iYAUV.css 3.33 kB (gz 1.07) — separate lazy chunk, UNDER the 25 kB gz target. Main index JS 262.01 kB (gz 83.33) vs baseline 261.27 (gz 83.12): +0.21 kB gz = the lazy route registration in App.jsx.
- [caution] ⚠ CONCURRENT AGENT detected mid-verify: src/styles.css, src/components.jsx, src/flair/flair.css have mtimes seconds old (23:28–23:31) — another lane is editing them, and the main index CSS drifted 28.15→29.16→30.82 kB across three of my builds with ZERO seam styles in it (grep -c "seam-" on the emitted index css = 0; all seam styles are in the separate Seam css chunk). Main-bundle deltas beyond my +0.21 kB gz are the other lane's, not SEAM's. Final numbers in this log may drift again if they keep editing.
- [strictmode] main.jsx wraps the app in React.StrictMode → dev double-mounts effects. Hardened: guest auto-join effect tears down its connection in cleanup (fresh socket on remount), SignalClient.close() nulls ALL ws handlers so abandoned connects never settle, transport.begin() is idempotent, and host treats a peer-left during "connecting" as "guest bounced, back to the QR" instead of the 15s gone-overlay. Without this, joining in dev occupied the room twice and hit the 409.
- [e2e] Two headless Chromes via puppeteer-core (installed in %TEMP%\seam-e2e, NOT in the repo's package.json; Chrome at C:\Program Files\Google\Chrome, debug ports 9444+9445 — two separate browser INSTANCES with background-throttling disabled, so neither tab's rAF loop stalls). iPhone-ish mobile emulation (390×844, hasTouch). Script preserved at src/game/__tests__/e2e.mjs (not imported anywhere; not bundled).
  - Gotcha found: vite dev binds ::1 only on this box — tests must target http://localhost:5173, not 127.0.0.1.
  - P2P RUN — ALL 12 PASS: host QR renders (data-room-url), guest joins via QR URL, both reach countdown then round, transport kind "p2p" on BOTH (WebRTC DataChannels work fine in headless Chrome, no fake-device flags needed), touch drags + taps on both pages, A spawned 4 / B spawned 5 bullets, spawn events arrived cross-phone (remoteBullets 5/4), state packets flowed (84/85 each way at 30 Hz), a hit registered and score incremented on BOTH pages, scores agree across phones (A 1-0, B 0-1 mirrored).
  - RELAY RUN (?forcerelay=1, unreachable TURN-only ICE) — ALL 13 PASS: same assertions plus kind === "relay" on both; full round + hit + agreed score over the DO relay path.
  - Screenshots at round phase: docs/overnight/audit-shots/seam-a.png + seam-b.png (light theme: dashed seam, sky ghost tick, amber chevron, pips/badge/exit HUD).
- [final build] green: Seam-BiLL0RJD.js 43.58 kB (gz 16.01) + Seam css 3.33 kB (gz 1.07) — lazy chunk, under 25 kB gz target. Main index-gzPvMJoB.js 262.01 kB (gz 83.32) = baseline +0.21 kB gz (the route). Main css 30.82 kB is the OTHER lane's current state (see caution above).
- [teardown] wrangler dev + vite dev + both Chromes killed (wrangler's workerd kept respawning — had to kill the node supervisor PID; verified 5173/8787/9444/9445 all free). Chrome scratch profiles in %TEMP% removed.

## What works / what's untested

WORKS (verified end-to-end in automation): pairing via QR URL → signaling → WebRTC DataChannels (p2p) AND forced DO-relay fallback → clock-synced countdown → drag/tap/charge input → bullets crossing the seam mirrored → hit detection → host-refereed scoring consistent on both phones. Worker: role assignment, 2-socket cap, verbatim relay, origin gate, idle alarm logic (logic-level).
NOT tested: real phones on LAN (needs `vite --host` + `wrangler dev --ip 0.0.0.0`), real cellular/CGNAT (needs deployed worker + TURN — explicitly deferred per plan §4), rematch flow beyond code-path (e2e stops at first score), disconnect 15s overlay (code-path only), dark theme canvas colors (token-driven, should follow), wake lock on real device, first-to-5 full match, audio audible check (synth code runs; muted in headless).

## Deploy-morning TODOs
1. `bunx wrangler deploy --config worker/seam-signal/wrangler.jsonc` then replace `PLACEHOLDER` in src/game/net/signal.js SIGNAL_URL with the real workers.dev host (one line, marked TODO).
2. The plan's §7 nav-brand 5-tap discovery gesture is NOT built (out of my file territory — components.jsx is forbidden). /seam is reachable only by URL right now.
3. Consider TURN credentials (plan §4) once real-world cellular pairs fail p2p — relay covers them meanwhile.
