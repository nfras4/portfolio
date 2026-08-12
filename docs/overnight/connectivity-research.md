# Phone-to-Phone Connectivity Research — Hidden 1v1 Browser Game

Status: COMPLETE
Context: Portfolio site is React 19 + Vite on Cloudflare Pages (Pages Functions). Owner also runs
Cloudflare Workers + Durable Objects in other projects (impostor, tally-rematch). Target UX: P1 opens
a page, sees a QR code, P2 scans with camera app, both connected within seconds, then ~30-60Hz
position/bullet updates for a 1v1 dodge/shoot game.

---

## 1. Web Bluetooth phone-to-phone

**CONFIRMED INFEASIBLE.** Verdict on record:

- The Web Bluetooth spec only defines the **central** role (a browser can scan for and connect to
  BLE peripherals). **Peripheral mode is explicitly out of scope** — the WebBluetoothCG's own
  implementation-status notes say defining peripheral behavior "requires substantial work and is
  not currently planned."
- That means a phone browser can *initiate* a BLE connection to a peripheral device (a heart-rate
  monitor, a smart bulb, etc.) but **cannot advertise itself as a connectable peripheral for another
  browser to find.** Two browser tabs cannot become central+peripheral to each other — there is no
  API for the peripheral half.
- **iOS Safari has zero Web Bluetooth support**, full stop, on any Apple platform (iOS, iPadOS,
  macOS Safari). The only workaround is a third-party extension (iOSWebBLE) that bridges to
  CoreBluetooth outside the standard API — not something a public game can require players to install.
- Global caniuse support sits around 76% (Chromium desktop + Android Chrome only; no Firefox, no Safari).

**Conclusion:** Web Bluetooth is a dead end for this use case on two independent grounds (no
peripheral-mode API at all, and no iOS Safari support even for central mode). Not worth prototyping.

---

## 2. WebRTC DataChannel on mobile browsers (2026)

- **Android Chrome:** full RTCDataChannel support, including unreliable/unordered mode
  (`{ordered: false, maxRetransmits: 0}` for UDP-like bullet/position packets). This has been stable
  for years and is not a concern.
- **iOS Safari:** WebRTC (including RTCPeerConnection + RTCDataChannel) has been supported since
  iOS 11, and by 2026 is mature — unreliable/unordered data channels work correctly in modern
  Safari/WebKit. The historical pain points (Safari-Chrome interop bugs, H.264-only codec quirks)
  were mostly video/codec-negotiation issues, not DataChannel reliability-mode issues. Search results
  did not surface any *current* iOS Safari DataChannel bug reports for unordered/unreliable mode —
  treat as usable, but validate empirically tonight (see Local Testing plan) since Safari WebRTC has
  a history of shipping regressions in point releases.
  - **iOS-wide caveat that matters more than Safari itself:** on iOS, ALL browsers (Chrome, Firefox,
    etc.) use Apple's WebKit engine under the hood due to App Store policy, so "Android Chrome vs iOS
    Safari" is really "any Android browser vs any iOS browser" — there is only one WebRTC
    implementation on iOS regardless of browser chrome.
  - PWA / "Add to Home Screen" home-screen web apps on iOS also run WebKit's WebRTC stack, no separate story.
- **STUN success on cellular / CGNAT:** roughly **80-90% success for STUN-only P2P** in favorable
  conditions (home broadband, simple NAT), but realistically **15-20% of consumer WebRTC sessions
  need TURN** to connect at all, and that rate climbs sharply on **cellular networks because of
  Carrier-Grade NAT (CGNAT)** — many carriers use symmetric NAT which STUN alone cannot traverse.
  Given this game's core scenario is "two strangers, phone cameras, likely at least one on cellular
  data at a meetup/party," **TURN must be treated as a required fallback, not an edge case.**
- **Cloudflare's TURN service** (`realtime.cloudflare.com`, part of "Cloudflare Realtime" /
  "Cloudflare Calls," formerly branded TURN/SFU): STUN at `stun.cloudflare.com` is free and
  unlimited. TURN relay is **$0.05/GB** with a **1,000 GB/month free tier** shared across TURN + SFU
  usage. For a lightweight 1v1 position/bullet game (small JSON or binary packets at 30-60Hz, no
  video), bandwidth per relayed match is tiny (a few KB/s each way) — the free tier comfortably
  covers heavy hobby/portfolio-demo usage. This is a strong fit: no separate TURN vendor needed, and
  it plugs into the same Cloudflare account as the rest of the owner's infra.

---

## 3. Signaling options on Cloudflare (Pages project)

The site is a **Cloudflare Pages** project (Pages Functions for its existing `/api/*` / `/testimonial`
routes per portfolio-site memory notes). Durable Objects **cannot be defined inside a Pages Functions
project** — DOs require a full Worker deployment (`wrangler.toml`/`wrangler.jsonc` with a
`[[migrations]]` block and a DO class export), which Pages Functions do not support natively.

- **(a) Separate Worker with a Durable Object doing WebSocket signaling — RECOMMENDED.**
  Current state (verified via Cloudflare docs, 2026): **yes, a Pages project can bind to a Durable
  Object that lives in a *different*, separately-deployed Worker.** You deploy a small dedicated
  Worker (e.g. `game-signal-worker`) that exports a DO class (e.g. `MatchRoom`), then in the Pages
  project's `wrangler.jsonc`/dashboard you add a Durable Object binding pointing at that external
  script name (`script_name` field in the binding config), OR — more simply for this use case —
  the game's client JS can just talk **directly to the Worker's own public URL/route**
  (`wss://game.<domain>/room/<id>`) without going through a Pages Function proxy at all, since the
  DO Worker can be deployed on its own subdomain or route. Binding Pages→DO cross-script is possible
  but adds indirection for no benefit here (no need to hide the DO behind the Pages Function since
  it's just a WebSocket signaling channel, not a secret). **Simplest and most idiomatic: deploy the
  DO Worker standalone, point the client straight at its WebSocket URL for signaling.**
  Local dev note: `wrangler pages dev` and `wrangler dev` (for the DO worker) run as separate
  processes; Pages dev supports `--do <BINDING>=<CLASS>@<SCRIPT>` for local cross-script DO binding,
  but again — not needed if the client just dials the DO worker's own dev URL directly.
- **(b) Pages Functions + KV polling.** KV is **eventually consistent globally** (propagation can
  take up to 60 seconds across edge locations, though same-datacenter reads are fast) and has no
  push mechanism — the client would have to poll every N hundred ms. For exchanging a single
  SDP offer/answer pair this *could* limp along with tight polling (200-500ms) tolerating a few
  seconds of pairing latency, but it's strictly worse than a WebSocket DO for "connected within
  seconds," and KV's per-key write-then-immediate-local-read propagation guarantee is the only thing
  saving this at all. **Not recommended when a DO is already the owner's normal pattern.**
  KV is also billed per operation, which is irrelevant at hobby scale but adds nothing over DOs.
- **(c) Plain HTTPS offer/answer exchange via a DO with polling.** A DO backing plain HTTP POST/GET
  (no WebSocket) for offer/answer exchange is simpler code than WebSocket signaling and still gets
  DO's single-threaded strong consistency (no eventual-consistency lag like KV), but still requires
  polling from the client to detect when the peer's answer has arrived — adds ~200-500ms+ of
  perceived pairing latency vs. a WebSocket push. Reasonable fallback-of-a-fallback but WebSocket is
  barely more code with a DO (DOs have first-class `WebSocketPair`/hibernation support) and is
  strictly better UX.
- **What people actually ship for QR-pair WebRTC games:** the common community pattern (seen in
  PeerJS-based games, Cloudflare's own multiplayer demos, and general WebRTC "pair two phones"
  tutorials) is: a lightweight WebSocket (or Firebase/Supabase realtime, or a plain relay server)
  room keyed by a short room code, where P1 creates a room and gets a code/URL, P2 joins the same
  room via the code embedded in a QR-coded URL, and the signaling channel pushes SDP offer/answer +
  ICE candidates between exactly two peers, then gets discarded once the DataChannel is `open`.
  A Durable Object is a very natural fit for this exact "exactly 2 participants, tiny amount of
  state, ephemeral room" pattern — it's effectively what DOs were designed for, and matches
  `impostor`'s and `tally-rematch`'s existing room-based DO usage (see §7).

---

## 4. Fallback transport: Durable Object WebSocket relay

If WebRTC negotiation fails entirely (both STUN and TURN blocked, or an iOS Safari DataChannel
quirk), relaying every position/bullet packet through a DO WebSocket (phone1 → CF edge DO →
phone2, both directions) is a legitimate fallback, not just a signaling channel:

- **Latency shape:** a DO instance runs at a single location (nearest to wherever it was first
  instantiated, or pinned via a location hint). The relay path for one packet is
  `phone1 → nearest CF edge/DO (mobile RTT) → phone2 (mobile RTT)`. Cloudflare's docs don't publish
  a hard same-city number, but the general shape is: mobile-to-nearest-edge RTT is commonly
  20-50ms on decent LTE/5G, same-city public sources put edge-to-edge/DO processing at low
  single-digit ms. So a realistic one-way "phone A input observed on phone B" latency via relay is
  **roughly 40-100ms**, versus **~20-60ms** for a direct P2P DataChannel (one RTT hop instead of two).
- **Is that playable for a dodge-bullets 1v1?** Yes, with normal caveats: competitive shooters
  target <50-80ms; casual/party-game dodge mechanics (large hitboxes, telegraphed attacks, not
  frame-perfect) are comfortably playable up to ~150ms, especially with basic client-side
  prediction/interpolation on each phone (render your own input immediately, only network the
  opponent's state). Given this is a portfolio easter-egg game, not a ranked shooter, **DO-relay
  fallback is acceptable as a fallback, not ideal as the primary path** — ship WebRTC first, relay
  second.
- **Practical note:** the DO used for signaling (§3) can be the *same* DO instance used for the
  relay fallback — no new infrastructure, just a mode switch: if `RTCPeerConnection.connectionState`
  never reaches `connected` within a timeout (e.g. 5-8s after ICE gathering completes), the client
  falls back to sending game messages over the *same* WebSocket that was used for signaling instead
  of tearing it down.

---

## 5. QR code generation client-side

- **Recommendation: `qrcode-generator`** (npm, also published as `qrcode-generator` — a
  dependency-free, vanilla-JS core QR matrix encoder with no rendering opinion). It is tiny
  (low single-digit KB minified+gzipped — historically one of the smallest widely-used QR encoders,
  no image/canvas dependency baked in) and has been the de-facto base for most other QR wrapper
  libraries (including `qrcode.react` internally) for years, so it's a safe "boring, stable"
  pick. Render the matrix yourself as an inline `<svg>` (a handful of `<rect>`s, or a single `<path>`)
  — this avoids pulling in a canvas/image renderer entirely and keeps the whole QR feature at a few
  KB.
  - Avoid `qrcode.react` / `react-qr-code` as a *dependency choice* here — they're fine libraries,
    but they exist to save you writing ~15 lines of SVG-from-matrix code, which is cheap to write by
    hand and saves the wrapper's overhead. Since the game is lazy-loaded (code-split) anyway, every
    KB in that chunk directly affects time-to-connect on a phone showing a QR code, so hand-rolling
    the render step is worth it here even though it wouldn't matter for a normal page.
  - Alternative if the owner wants zero library at all: QR encoding logic itself is non-trivial
    (Reed-Solomon error correction) — do not hand-roll the *encoder*, only the *SVG renderer* on top
    of `qrcode-generator`'s output matrix.
- **Session token in the URL fragment: confirmed correct and safe.** URI fragments
  (`https://site.com/duel#<roomId>` or `#<full-token>`) are a browser-only construct — **fragments
  are never transmitted to the server in the HTTP request line, headers, or referrer by spec**, so
  they never appear in Cloudflare's edge logs, Pages Functions logs, or any server-side analytics.
  This is a well-established pattern (used by Firefox Send/Wormhole-style "zero-knowledge" links) for
  exactly this reason. Practical implementation notes for this game:
  - Put the room code / pairing secret after `#`, e.g. `https://nickwfraser.dev/duel#abc123`.
  - Read it client-side via `location.hash.slice(1)`.
  - **Caveat:** if the game ever needs server-side validation of the *room code itself* (e.g. the DO
    needs to know which room to join), that's fine — the DO is reached via a WebSocket URL the
    client constructs itself from the fragment value; the fragment just needs to make it into the
    *client-constructed* WS URL, which the browser is allowed to do (fragments are visible to JS,
    just not auto-sent by the browser's own top-level navigation). Do not put the token in a normal
    query string if avoiding server logs is a real goal — query strings DO get logged.

---

## 6. Same-device-network edge cases

- **Both phones on the same Wi-Fi:** mDNS host-candidate obfuscation has been the default in mobile
  Chrome and Safari for years (Safari since iOS 13, Chrome since ~M79ish) — **both browsers still
  hide real LAN IPs behind a rotating per-session `.local` mDNS hostname** in ICE candidates rather
  than exposing raw private IPs. This does **not** break same-Wi-Fi P2P connectivity — the mDNS
  hostname still resolves locally between two devices on the same LAN segment/multicast domain, so
  local candidates typically still connect directly and fast (sub-10ms LAN RTT). It only prevents
  *other* scripts on the page (or third parties) from reading the real IP. No action needed; this is
  transparent to the app.
  - Caveat: some public/guest Wi-Fi networks (common at cafes, some venues) block multicast/mDNS or
    isolate clients from each other (AP/client isolation) specifically to stop peer discovery — in
    that case same-Wi-Fi P2P can actually be *worse* than STUN/TURN via the public internet, because
    client-isolated Wi-Fi blocks direct LAN candidates AND local NAT reflexive candidates might not
    apply either. STUN/TURN via the internet acts as a safety net here too, so the app should never
    assume "same Wi-Fi = automatically best path" — let ICE try all candidate types and pick
    whichever connects.
- **One on Wi-Fi, one on cellular:** ordinary WebRTC ICE case — STUN reflexive candidates from each
  side, TURN relay if a direct path can't be found (this is the common case flagged in §2: cellular
  CGNAT frequently forces TURN). No special handling needed beyond having TURN configured
  (Cloudflare Realtime TURN, §2) as part of the ICE server list from the start — don't treat TURN as
  an opt-in fallback tier, just always include TURN servers in the `iceServers` config alongside
  STUN so the browser's ICE agent picks the best working pair automatically.

---

## 7. Existing owner DO/WebSocket patterns to match (impostor, tally-rematch)

**`tally-rematch` has no Durable Object usage** — it's the Itemate SvelteKit app (D1 + auth +
Stripe), confirmed via `wrangler.toml` (no `durable_objects` block) and a repo-wide grep for
`DurableObject`/`durable_objects` (zero matches). Not a useful reference for this task beyond
general wrangler config hygiene (secrets via `wrangler secret put`, documented `[vars]`, custom
domain routes).

**`impostor` (`D:\claudecode\impostor`, deployed as `nfras4arcade`) is the directly reusable
pattern** — it already runs 12 per-game-room Durable Object classes on Cloudflare Workers with
WebSocket Hibernation, which is structurally almost identical to what this game needs (one DO class
per "match room," two participants, ephemeral). Key files and conventions to mirror:

- **`D:\claudecode\impostor\wrangler.jsonc`** — DO binding + migration pattern:
  ```jsonc
  "durable_objects": { "bindings": [{ "name": "IMPOSTOR_ROOM", "class_name": "ImpostorRoom" }] },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["ImpostorRoom"] }, ...]
  ```
  New DO classes get a new incrementing `tag` appended — **never remove or reorder existing
  migration entries** (explicit repo convention, called out in the file's own comments).
- **`D:\claudecode\impostor\worker\impostor\room.ts`** — the DO class itself:
  `export class ImpostorRoom extends DurableObject<Env>`, with `ctx.storage` for persisted room
  state (`loadState()` lazily hydrates from `ctx.storage.get('room')` once per DO instance), a
  `fetch(request)` handler (line ~168) that does the WebSocket upgrade
  (`const pair = new WebSocketPair()`, line ~203) and **`this.ctx.acceptWebSocket(server, [userId,
  role, socketId])`** (line ~214) — the Hibernation API tag array, not plain `server.accept()`. This
  lets sockets survive DO hibernation (the DO can be evicted from memory between messages to save
  cost, and reconnects instantly on the next `webSocketMessage` event). **Critical gotcha
  documented in the repo's own CLAUDE.md**: `loadState()` must reconcile a rehydrated `connected`
  flag against `ctx.getWebSockets()` (the actually-live sockets), never blanket-mark everyone
  disconnected on load — hibernation means sockets can still be open even though the in-memory
  fields were just reset from storage.
- **`D:\claudecode\impostor\scripts\patch-worker.ts`** — because impostor is built with SvelteKit +
  `adapter-cloudflare`, the adapter emits a single generated `worker/index.js` that this script
  post-patches to (a) import each DO class so it's exported from the worker entrypoint (DO classes
  must be named exports of the main worker script) and (b) intercept `worker_default.fetch` to
  route `Upgrade: websocket` requests by pathname (`{'/ws': 'IMPOSTOR_ROOM', '/ws/president':
  'PRESIDENT_ROOM', ...}`) to `env[doBinding].get(id).fetch(request)`, plus an Origin check
  ("Cross-Site WebSocket Hijacking guard" — SameSite cookies don't cover WebSocket upgrades). **This
  portfolio game does not need the patch-worker step** since it isn't going through a SvelteKit
  adapter — a hand-written Worker entrypoint can export the DO class and do the same
  pathname-routing + Origin-check logic directly and more simply.
- **`D:\claudecode\impostor\worker\shared\pairingTokens.ts`** — directly relevant prior art for a
  short-lived pairing/join-code flow: an in-memory `Map<token, TokenEntry>` with a 60s TTL, a
  32-byte crypto-random token plus a **6-character short-code prefix** for a "typeable code"
  fallback path, capped at 10,000 entries with LRU-style eviction, and a `consumeToken()` that
  returns a generic `'expired'` error on miss (not a distinguishing error) specifically to avoid an
  existence-leak side channel. This game's QR-embedded room token doesn't need the short-code
  fallback (nobody types a QR-paired code by hand) but the TTL + one-time-consume + generic-error
  pattern is exactly right to reuse for "room code has been claimed by the second player, socket
  handshake proceeds."
- **Reconnection/timeout conventions** (from `impostor`'s CLAUDE.md, worth matching): 45s grace
  period on disconnect before marking a player fully gone; hosts get re-promoted on drop. For a 1v1
  duel game this simplifies to "if the opponent's socket drops, pause and show a reconnect countdown,
  then end the match" rather than impostor's multi-player host-migration logic.

**Bottom line for §7:** build the new game's signaling/relay Worker as a small, purpose-built
sibling to `impostor` — same DO-per-room shape, same Hibernation API usage, same wrangler DO
migration discipline — but as its own minimal Worker (not bolted onto the SvelteKit adapter
patch-script pattern, since the portfolio site is React/Vite/Pages, not SvelteKit/adapter-cloudflare).

---

## 8. Wake Lock, orientation lock, fullscreen on iOS Safari

- **Screen Wake Lock API:** well-supported by 2026 — **Safari 16.4+ on iOS/iPadOS supports
  `navigator.wakeLock.request('screen')`**, and Chromium/Firefox support it everywhere too (global
  support >94%). One remaining historical gotcha: **installed PWAs (Add to Home Screen) had a
  wake-lock bug that Apple didn't fix until iOS 18.4** — since this game is expected to be played
  as a regular Safari tab (opened straight from a QR/camera scan, not an installed PWA), this
  shouldn't matter, but avoid steering players toward "Add to Home Screen" for this feature if
  targeting pre-18.4 devices is a concern. Use it defensively: request on user gesture (the "start
  game" tap), re-request on `visibilitychange` if the lock was released (tab backgrounded then
  resumed), and treat failure as non-fatal (screen dimming mid-match is a UX papercut, not a
  correctness issue).
- **Fullscreen API on iOS Safari:** **confirmed still restrictive** — iOS Safari (through iOS 17)
  only supports `requestFullscreen()` on `<video>` elements, not arbitrary elements/the whole page.
  There were iOS 17.4 beta signs of Apple testing div-level fullscreen on iPhone, but nothing
  confirmed as stable/shipped widely as of the available sources. **Do not build a "fullscreen
  canvas" UX that depends on the Fullscreen API on iPhone** — it will silently no-op or throw.
  Practical alternative: fake fullscreen with CSS (`position: fixed; inset: 0; width:100vw;
  height:100dvh`) plus hiding the URL bar via scroll tricks / `100dvh` (dynamic viewport units,
  which are what actually solve the old "100vh includes the address bar" problem on iOS Safari) —
  this gets a visually fullscreen game without ever calling the Fullscreen API, and works
  identically on iPhone and Android.
- **Screen orientation lock:** **`screen.orientation.lock()` is NOT supported in Safari on
  iOS/iPadOS/macOS at all** (returns unsupported / rejects) — this has been a long-standing WebKit
  gap with no sign of closing. Two real options for "portrait game" on iOS: (1) **don't fight it —
  design the game UI to be responsive to both orientations** (simplest, most robust, zero API
  dependency), or (2) if portrait must be enforced, show a **CSS-only "please rotate your device"
  overlay** using a `@media (orientation: landscape)` query that blocks play until the phone is
  physically portrait — this is the standard workaround used by mobile web games today and needs no
  JS API at all. Android Chrome *does* support `screen.orientation.lock()`, but only in fullscreen
  context, so a cross-platform game can't rely on it as the sole mechanism anyway — the CSS overlay
  approach is the one that works everywhere.

---

## Recommended architecture

**Transport:** WebRTC `RTCDataChannel` in unreliable/unordered mode
(`{ ordered: false, maxRetransmits: 0 }`) for gameplay packets (position/bullet state at 30-60Hz),
sent as small binary payloads (e.g. a packed `ArrayBuffer`, not JSON, to keep packets tiny).
`iceServers` list includes both Cloudflare's free STUN (`stun.cloudflare.com`) and Cloudflare
Realtime TURN credentials from the start (not opt-in) — cellular CGNAT makes TURN a normal-path
requirement, not an edge case, for this app's actual usage pattern (two strangers, phones, probably
at least one on cellular).

**Signaling:** one small, standalone Cloudflare Worker (sibling to `impostor`, not bolted onto the
Pages project) exporting a single `DuelRoom` Durable Object class, using the WebSocket Hibernation
API exactly like `impostor/worker/impostor/room.ts`. The DO holds at most 2 sockets, relays SDP
offer/answer + ICE candidates between them, then either goes idle (WebRTC connected — DataChannel
takes over) or stays active as the relay fallback (§4) if WebRTC negotiation times out.

**Pairing flow:** P1 opens `/duel` on the portfolio site → client generates a random room ID → opens
a WebSocket to the DO Worker (`wss://duel.nickwfraser.dev/room/<roomId>`) → renders a QR code
encoding `https://nickwfraser.dev/duel#<roomId>` (room ID in the URL **fragment**, never sent to any
server, never in Cloudflare logs) using a hand-rolled SVG renderer over the `qrcode-generator`
package (§5). P2 scans with the camera app (native camera→Safari/Chrome hand-off, no app install),
opens the URL, client reads `location.hash`, opens the same DO WebSocket with that room ID, and
WebRTC offer/answer/ICE proceeds over that channel. Once `RTCPeerConnection.connectionState ===
'connected'`, gameplay moves onto the DataChannel and the signaling socket can go quiet (kept open
only as the relay fallback path).

**Fallback:** if `connectionState` hasn't reached `connected` within ~6-8s of ICE gathering
completing, stop waiting for the DataChannel and switch to relaying gameplay messages over the
already-open DO WebSocket (§4) — same message shapes, different transport, transparent to game
logic if the networking layer is written behind one small interface (`send(packet)` /
`onPacket(cb)`) with two implementations (`WebRTCTransport`, `RelayTransport`).

**Libraries:** `qrcode-generator` (tiny, dependency-free QR matrix encoder) + a ~15-line hand-rolled
SVG renderer, no other new dependencies. No signaling library needed (raw `WebSocket` +
`RTCPeerConnection` are sufficient for a 2-peer room).

**Where the code lives:**
- Game UI/logic: inside the existing portfolio repo (`D:\claudecode\portfolio`), lazy-loaded route
  (matches the "hidden in a portfolio site" + "game is lazy-loaded" framing already given).
- Signaling + relay DO: a **new, separate Worker project** (e.g. `D:\claudecode\portfolio-duel-worker`
  or similar, deployed independently via its own `wrangler.jsonc`, modeled directly on
  `D:\claudecode\impostor\wrangler.jsonc` + `worker/impostor/room.ts`). Reasoning: Pages Functions
  cannot host a DO class themselves (§3); a standalone Worker is simpler than binding Pages→external-DO
  for a pure WebSocket signaling channel, and it matches the owner's existing, working pattern
  exactly (impostor already proves this shape in production).

### Sequence diagram (text form)

```
Player 1 (phone)              Duel Worker (DO: DuelRoom)              Player 2 (phone, scans QR)
      |                                |                                       |
      |--- open /duel -----------------|                                       |
      | (client generates roomId)      |                                       |
      |--- WS connect /room/<roomId> ->|                                       |
      |                                |--- accept, DO created/loaded -------->|
      |<-- QR renders: url#<roomId> ---|                                       |
      |                                |                                       |
      |        [P1 shows QR, P2 opens camera app, scans, taps link]            |
      |                                |                                       |
      |                                |<---------- WS connect /room/<roomId> -|
      |                                |         (roomId read from #fragment)  |
      |                                |--- notify P1: peer joined ----------->|
      |<-- peer-joined ----------------|                                       |
      |                                |                                       |
      |--- SDP offer ----------------->|                                       |
      |                                |--- relay SDP offer ------------------>|
      |                                |<-- SDP answer ------------------------|
      |<-- relay SDP answer -----------|                                       |
      |--- ICE candidates ------------>|--- relay ICE candidates -------------->|
      |<-- relay ICE candidates -------|<-- ICE candidates ---------------------|
      |                                |                                       |
      |======= RTCPeerConnection negotiates directly (STUN, then TURN if needed) =======|
      |<================== RTCDataChannel: 'open' (both sides) =======================>|
      |                                |                                       |
      |===== gameplay: position/bullet packets over DataChannel, 30-60Hz P2P direct ====|
      |                                |                                       |
      |         [ONLY IF DataChannel never reaches 'connected' within ~6-8s]   |
      |--- game packet (relay mode) -->|--- forward over WS -------------------->|
      |<-- forward over WS ------------|<-- game packet (relay mode) ----------|
```

### Local testing plan for TONIGHT (no production deploy)

**Production deploy is forbidden tonight — this entire plan runs against local dev servers only.**

1. **Signaling Worker, local:** `wrangler dev` in the new duel-worker project. `wrangler dev`
   binds to `localhost` by default but supports `--ip 0.0.0.0` to listen on the LAN interface, so
   phones on the same Wi-Fi as the dev machine can reach it at
   `ws://<dev-machine-LAN-IP>:8787/room/<id>` (find the LAN IP with `ipconfig`). This mirrors how
   `impostor`'s own dev flow hardcodes port 8787 for its client WS (per its CLAUDE.md).
2. **Portfolio site, local:** `vite dev --host` (Vite's `--host` flag, equivalent purpose to
   wrangler's `--ip 0.0.0.0`) so it's also reachable at `http://<dev-machine-LAN-IP>:5173` from
   phones on the LAN. Point the game's WS client at the duel-worker's LAN dev URL for this test
   (env var / dev-only override — do not hardcode a LAN IP into anything that could ship).
3. **Two-phone test (the real target scenario):** both phones on the same home Wi-Fi as the dev
   machine tonight — this exercises §6's "same Wi-Fi, mDNS candidates" path, which is the *easiest*
   case (no TURN needed, likely no CGNAT). It validates the pairing flow, QR scan-to-connect UX,
   and DataChannel send/receive end-to-end, but **does not validate the cellular/CGNAT/TURN path**
   — that needs one phone on Wi-Fi tethered to the dev server and one phone on real cellular data,
   which requires the dev server to be reachable from the public internet (e.g. via `cloudflared
   tunnel` / ngrok pointed at the local `wrangler dev` + Vite ports) — reasonable to do tonight
   since it's still not a production deploy, just a temporary tunnel to a local process, but it does
   mean the Cloudflare TURN relay path can't be exercised at all without deployed TURN credentials
   working from a public origin. **If time-boxed, prioritize:** (a) same-Wi-Fi two-phone pairing +
   DataChannel gameplay loop working end-to-end, (b) two-*browser-tab* test on the dev machine
   itself (fastest iteration loop, chrome://webrtc-internals gives full ICE candidate visibility) to
   validate signaling logic and the relay-fallback code path by artificially forcing it (e.g.
   temporarily feeding a bogus TURN-only `iceServers` config to force relay), deferring the true
   cellular/TURN validation to the next real deploy.
4. **iOS Safari specifically:** test from a real iPhone (not just Chrome DevTools device emulation,
   which does not emulate WebKit's actual WebRTC stack) — this is the one browser engine where §2's
   "should work but verify empirically" caveat lives. Safari's `Settings → Advanced → Web Inspector`
   + a Mac running Safari's own Web Inspector (`Develop menu → <iPhone name>`) gives console/network
   access to the phone's session for debugging, no App Store app required.
5. **What "done for tonight" looks like:** two phones (or one phone + one browser tab, minimum) go
   from QR scan to an open DataChannel exchanging test packets, on the local network, with no
   production deploy — proving the pairing UX and the core transport before spending more time on
   TURN/production wiring in a later session.
