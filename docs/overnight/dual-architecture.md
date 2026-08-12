# SEAM — architecture plan for the two-phone duel easter egg

Plan of record, written 2026-08-13 (overnight session) after the research phase.
Inputs: `dual-game-research.md` (mechanics dossier) and `connectivity-research.md`
(transport/signaling research). Decisions here are final for tonight's build;
deviations get logged in `/DECISIONS.md`.

## 1. What we're building

A mechanical homage to DUAL! (Seabaa, 2015): two phones become one continuous
arena. Each player sees their own half; bullets fired "up" off your screen
cross the seam and come "down" onto the opponent's screen. Original name
(**SEAM**), original art (the portfolio's own palette and type system),
original sounds (WebAudio synth, no assets). Hidden route on the portfolio,
mobile-only, lazy-loaded so it costs nothing until opened.

Tonight's scope is **DUEL mode only** (1v1). DEFEND/DEFLECT are architecture-
compatible later additions (see §9). Vertical slice priority per the brief:
pairing + core movement/shooting must work end-to-end before any polish.

## 2. The shared arena model

One normalized coordinate space stitched at the seam (research doc §A):

- `x ∈ [0, 1]` across the arena width.
- `y ∈ [0, 2]`: player A owns `[0, 1)`, player B owns `(1, 2]`. The seam is `y = 1`.
- Each phone renders its own half full-screen: own baseline (ship lane) at the
  bottom, seam at the top. The opponent's half is the same space rotated 180°,
  matching phones placed top-edge-to-top-edge (research §A2 recommendation).
- Mapping for B rendering shared point `(x, y)`: `screenX = 1 − x`,
  `screenY = (y − 1)` measured from the seam downward. A bullet exiting A's top
  at `x = 0.3` heading up-right appears at B's top at `screenX = 0.7` heading
  down-left — one continuous flight, the moment reviewers singled out.
- Aspect ratios: each half is 1.0 normalized-height regardless of device;
  physics runs in normalized units so mismatched devices stay fair
  (research §7's recommended normalization).

## 3. Mechanics (DUEL)

| Mechanic | Decision | Basis |
|---|---|---|
| Movement | 1D lane above own baseline; **relative touch-drag** (finger anywhere, ship follows horizontal delta ×1.4) | Research confirms tilt in the original, but iOS DeviceOrientation needs a permission prompt that would break scan-and-play; drag is the deliberate browser adaptation. Tilt = future option. |
| Shooting | Tap = quick shot. Hold ≥150 ms charges 0→1 over 900 ms; release fires. Charge scales speed ×(1+0.9c) and radius ×(1+0.8c). 280 ms cooldown. | "tilt, dodge, charge, shoot" confirmed; curve is our tuning. |
| Bullet travel | Base speed ~0.55 units/s → ~1.4 s to cross both halves uncharged | Research §C11: crossing must be slow enough to read and dodge. |
| Hits | One-hit-kill per round | Research §5 inference, standoff framing. |
| Match | First to 5 round wins; 3-2-1 synced countdown between rounds | Research §D12/15 recommendation. |
| Opponent presence | Faint "ghost" tick at the seam showing opponent's x | Research §A4 open question — chose visible-but-subtle: aimable without killing surprise. |
| Walls | Bullets bounce off side walls once, then die at baselines | Meduza changelog confirms wall-bounce exists in the original's physics vocabulary; one bounce keeps duels angular but readable. |
| Feedback | Screen shake + WebAudio blip on fire/cross/hit; `navigator.vibrate` where supported (Android) | Original design; iOS has no vibrate API. |

## 4. Netcode

Transport per connectivity research: **WebRTC RTCDataChannel**, with the
signaling Durable Object doubling as relay fallback.

- Two channels: `state` (unordered, maxRetransmits 0) for 30 Hz ship position
  packets (binary: type u8, seq u16, x f32, vx f32, charge f32); `events`
  (ordered, reliable) for JSON: bullet spawns, hits, round control, ping/pong.
- **Authority split** (the pattern that survived Emberwood co-op: one side owns
  the outcome, the owner of the body owns the arithmetic): each phone is
  authoritative for its OWN ship position and its OWN death. I simulate
  incoming bullets locally and detect hits on MY ship; I announce `hit` and
  that is final — no dispute path. Bullet spawns are authoritative from the
  shooter (spawn event carries pos/vel/charge + sender timestamp).
- Clock: `events` channel ping/pong estimates offset (RTT/2); received spawns
  are forward-extrapolated by the estimated latency so trajectories line up.
- Host referee: player 1 (room creator) sequences rounds — countdown start
  times, score tally, rematch — so both phones agree on match state.
- **Relay fallback**: if `connectionState` isn't `connected` ~7 s after ICE
  gathering, the same message shapes flow over the already-open signaling
  WebSocket. One `Transport` interface (`send(bytes|obj)`, `onMessage`), two
  implementations; game logic can't tell which is active. STUN only tonight
  (`stun.cloudflare.com`, Google fallback) — Cloudflare TURN needs
  account-side credential minting, i.e. production work; the relay covers
  hard-NAT pairs meanwhile. TURN upgrade steps go in MORNING-REVIEW.

## 5. Signaling worker (NOT deployed tonight)

`worker/seam-signal/` inside this repo (keeps the whole review on one branch;
deployable standalone via its own `wrangler.jsonc`).

- Modeled on `impostor/worker/impostor/room.ts`: one `SeamRoom` DO class,
  WebSocket Hibernation API (`ctx.acceptWebSocket(server, [role])`), max two
  sockets (host/guest), relays signaling + relay-mode packets between them.
- Room IDs: 128-bit crypto-random, base36, generated client-side, carried in
  the **URL fragment** (`/seam#r=<id>`) so they never appear in server logs.
- wrangler config follows impostor conventions: DO binding `SEAM_ROOM`,
  `migrations` tag v1 with `new_sqlite_classes`, Origin check on upgrade
  (allow nickwfraser.dev + localhost/LAN dev origins).
- Rooms are ephemeral: DO state is just the two sockets + created-at; a 10 min
  alarm closes idle rooms.

## 6. Pairing flow

1. P1 (on phone) opens the easter egg → client generates roomId → connects
   `wss://<signal-host>/room/<id>` → full-screen QR renders encoding
   `https://nickwfraser.dev/seam#r=<id>` (`qrcode-generator` package + ~15-line
   hand-rolled SVG renderer — the only new dependency).
2. P2 scans with the native camera → URL opens → client reads the fragment,
   joins the same room → DO notifies P1.
3. Offer/answer/ICE relayed through the DO → DataChannels open → ready
   handshake → countdown → play. Signaling socket stays open quietly as the
   relay fallback and for rematch coordination.
4. Disconnect mid-match: overlay + 15 s rejoin window (guest can rescan the
   still-valid QR), then back to menu. Wake lock requested on game start;
   released on exit. Portrait enforced by a CSS `orientation: landscape`
   overlay (no lock API on iOS).

## 7. Where it lives in the app

- `src/game/` — `Seam.jsx` (route shell + phase state machine: menu → host/join
  → connecting → countdown → round → score → end), `engine/sim.js` (fixed-step
  120 Hz logic, canvas-2D renderer at rAF), `net/` (signal client, transports,
  protocol), `qr.js`, `seam.css`. **Canvas 2D, not three.js** — keeps the lazy
  chunk small (~15–20 kB target incl. QR lib).
- Route `/seam` added in `App.jsx` via `React.lazy` like `/showcase` — zero
  cost until visited. Not in nav, not in any sitemap.
- **Discovery (mobile only):** tapping the nav brand's `/` five times within
  2.5 s on a coarse-pointer device navigates to `/seam`. Desktop visitors to
  `/seam` see a small card: "this one needs two phones" + a QR of the page URL.
  A one-line console hint ships for dev-tools spelunkers.
- Config: `SIGNAL_URL` constant — `ws://<hostname>:8787` in dev,
  `wss://seam-signal.<account>.workers.dev` placeholder for prod (Nick wires
  the real URL after deploying the worker; one line, documented in
  MORNING-REVIEW).

## 8. Test plan for tonight (no deploys)

1. Two-browser-tab test on the dev box (fastest loop): `wrangler dev` the
   worker on :8787 + `vite --host`, two emulated-mobile tabs, full match.
2. Relay-fallback path forced by feeding an unreachable `iceServers` config —
   proves the fallback before anyone needs it.
3. LAN two-device sanity if possible from this machine (phones can hit
   `http://<LAN-IP>:5173`); real cellular/TURN validation explicitly deferred
   (needs deployed worker) — flagged for morning.
4. Desktop non-regression: the route is lazy; main-bundle size compared
   against baseline from the audit lane.

## 9. Explicitly deferred

- DEFEND / DEFLECT modes (the sim's entity + seam-crossing model supports a
  shared ball/wave entities; modes slot in as new phase machines).
- Ship variants (research §C9's "ship = bullet behavior script" insight — the
  spawn event already carries a `kind` field so variants are additive).
- TURN credentials, tilt controls, cosmetic unlocks, leaderboards.
