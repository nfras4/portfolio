# DUAL! by Seabaa — Mechanical Research Dossier

Research target: DUAL! (aka "Dual!"), a two-player local-multiplayer mobile game by Seabaa, Inc. — the solo-developer studio of Sebastian Gosztyla, based in Chicago, Illinois. **[CONFIRMED: press sheet]** Released April 2, 2015 for iOS and Android (also listed on Amazon Appstore). Two phones are placed together so their screens act as one shared arena; bullets/objects fired on one screen fly off its edge and appear on the neighbouring device's screen.

Purpose: enable a developer to build an ORIGINAL mechanical homage — same rules/feel/pacing, entirely new art, audio, name, and text. This document contains no verbatim marketing copy and no asset descriptions beyond generic terms (e.g. "minimalist vector aesthetic") needed to describe game feel.

Status: RESEARCH COMPLETE within the limits of publicly reachable web sources (see Section 8 and Source List for what could NOT be found: no full third-party reviews, no transcribed gameplay video, no direct app inspection). Each claim below is tagged **[CONFIRMED: source]** or, where evidence was thin/absent, **[NOT CONFIRMED]** / **[INFERRED]** (reasoned from partial/indirect evidence or genre convention, always clearly marked as such — never presented as fact).

---

## 1. Core concept — shared play space across two screens

- **[CONFIRMED: seabaa.com/dual, App Store listing]** Two phones are physically placed together (edge to edge) so they act as one shared arena. Marketing language: the game "transforms two phones into a single battlefield" and "bullets fly between screens in real-time." Source: https://seabaa.com/dual/ , https://apps.apple.com/us/app/dual/id918902604
- **[CONFIRMED, general]** The core hook, repeated across every source found so far, is that projectiles leaving one device's screen edge reappear on the neighbouring device's screen edge — i.e. the two rectangles are stitched into one continuous coordinate space along the shared boundary.
- **[CONFIRMED: press sheet, seabaa.com/dual/press/sheet.php?p=dual]** "Each player's mobile device represents one half of the digital game space. Players must position their phones together to see bullets traveling between devices" — this confirms the two screens are conceived as ONE continuous field split down a shared seam, not two independent arenas with a messaging layer between them. The player-facing mental model is "one arena, temporarily rendered on two panes," not "my screen + your screen + a wire."
- **[NOT CONFIRMED — genuine open question]** Exact edge orientation (top-edge-to-top-edge, i.e. phones held upright facing each other across a table with their tops touching, vs. side-by-side long-edge-to-long-edge, i.e. phones laid flat) was not stated explicitly in any source reached. Store screenshots were not visually inspected (WebFetch cannot render images). Reasoning from the genre and from "DUEL... classic duel standoff" framing (two combatants facing off) plus "sit opposite them" (Kaijupop quote, implies players are physically facing each other across a table, phones between them) points toward: **phones stood on a table top-edge-to-top-edge (or bottom-edge-to-bottom-edge depending on phone orientation), each player looking down/across at their own screen, with bullets traveling "up and off my screen" then "down and onto their screen."** This is the most mechanically sensible reading given "tilt to dodge" (implies each player holds their own phone in front of them, not lying flat) but is **INFERRED, not confirmed** — flagged in the Design Spec as an assumption to validate or deliberately choose fresh for the homage.
- **[NOT CONFIRMED]** Whether the opponent's ship is rendered as a visible shadow/silhouette on your own screen (so you can anticipate where their shot will emerge relative to your side) or whether you only ever see your own ship plus incoming bullets is not stated by any source reached. This is a meaningful game-feel fork and is flagged as an open design question.

---

## 2. Movement controls

- **[CONFIRMED: every storefront listing, consistently across App Store/Google Play/Amazon/apkpure/press sheet]** DUEL mode's own tagline is literally "tilt, dodge, charge, and shoot" — tilt (device orientation / accelerometer) is confirmed as the primary movement input, at least for the default/base ship in DUEL mode. This is stated as a defining verb of the mode, not an optional control scheme.
- **[CONFIRMED: multiple listings, "simple one-touch controls"]** Shooting/firing is framed as a single-tap ("one-touch") action layered on top of tilt-to-move — i.e. the two hands do two different jobs: the whole-device tilt steers the ship, a tap (thumb) fires.
- **[NOT CONFIRMED]** Whether movement is horizontal-only (ship confined to a lane near the bottom/near edge of the player's own screen, like a shmup) or free 2D within the player's own screen half was not stated explicitly anywhere reached. Given tilt is the input (a physical rotation gesture most naturally maps to 1D left-right steering, and tilt-based mobile games near-universally use it for horizontal/lateral movement rather than full 2D because there's no comfortable tilt axis for "forward/back into the screen"), the most defensible inference is: **tilt maps to horizontal position along the player's own baseline (the edge nearest the opponent, or the near edge — whichever edge bullets exit toward), i.e. effectively a 1D duel like an inverted Pong paddle, not free 2D movement.** This is INFERRED from control-scheme convention, not confirmed by a source describing the movement axis directly. Flagged for the Design Spec.
- **[NOT CONFIRMED]** Whether DEFEND and DEFLECT modes use the same tilt-to-move scheme as DUEL, or a different one (e.g. drag-to-move, since DEFEND is cooperative and may need faster/more precise repositioning to intercept multiple attackers) is not confirmed by any source. Genre convention and the shared "simple one-touch controls" tagline suggest the control scheme is likely consistent across modes, but this is an assumption.

---

## 3. Shooting / ammo / energy

- **[CONFIRMED: every storefront listing]** Duel mode involves "charge" as an explicit verb alongside dodge/shoot — confirms a hold-to-charge, release-to-fire shot mechanic exists (not simple unlimited auto-fire), at minimum for the base ship/mode.
- **[CONFIRMED: seabaa.com marketing]** Firing itself is a single tap ("one-touch") — the charge is likely expressed as tap-and-hold duration rather than a separate meter that fills passively over time, though this distinction (active hold-to-charge vs passive regen-then-tap) is not explicitly disambiguated by any source.
- **[CONFIRMED, indirectly via changelog]** Ships vary this base loop meaningfully: KOMAR trades single charged shots for a continuous spray of small homing bullets (implying either no charge requirement, or a different fire-rate/ammo model per ship); JEZ fires a projectile that is NOT resolved on impact but instead requires a second input (a swipe) to detonate, adding a two-stage risk/reward layer (do you detonate early for a guaranteed but weaker hit, or wait for better opponent positioning at the risk they dodge or your own timing lapses). This strongly suggests the "shooting" system is not one fixed mechanic but a shared framework (aim/tilt position + trigger input) that each ship re-skins with a different bullet-behavior script — an important structural takeaways for the homage: **build one generic "ship defines: fire input mapping + bullet spawn/behavior/collision script" interface, then vary it per ship, rather than hard-coding a single bullet type.**
- **[NOT CONFIRMED]** Exact ammo/energy economy (is there a maximum charge cap, a cooldown between shots, a limited-ammo pool that regenerates, or literally unlimited shots gated only by charge time) is not stated by any source reached. This is flagged as an open question in the Design Spec, where a reasonable default (charge-gated, uncapped fire rate, no separate ammo pool) is proposed.
- **[NOT CONFIRMED]** Relationship between bullet speed and ship movement speed (i.e. can you outrun your own bullets, can the opponent dodge by simply tilting fast enough, is bullet travel time across the two-screen gap long enough to create a genuine read-and-react dodge window) is not stated numerically anywhere. This is inherently a tuning/feel question that would need playtesting in the homage rather than a copyable number.

---

## 4. Game modes

**[CONFIRMED across seabaa.com + App Store + Google Play descriptions, consistent wording]** Three modes:

1. **DUEL** — 1v1 competitive standoff. Players tilt phones, dodge incoming bullets, charge their own shot, and fire across the screen boundary at the opponent. Framed as "classic 1v1 combat across screens."
2. **DEFEND** (also referenced as "DEFENSE" on seabaa.com) — Cooperative mode. Two players work together, defending "the middle" (a shared central point/objective that spans both screens) against waves of attacking enemies.
3. **DEFLECT** — Players score goals by "blasting, banking, and curving" a ball back and forth from one screen to the other — essentially a two-screen air-hockey/pong hybrid where the ball, not bullets, is the shared object.

Sources: https://seabaa.com/dual/ , https://apps.apple.com/us/app/dual/id918902604 , https://play.google.com/store/apps/details?id=com.Seabaa.Dual

- **[NOT CONFIRMED]** Round format / win conditions (first-to-N points, single sudden-death round, best-of-N, or a timer) could not be confirmed from any storefront text, press sheet, or the reachable review pull-quotes. No source stated a specific number. This is flagged as an open question in the Design Spec, where a genre-typical default (short sudden-death rounds, first-to-N match structure) is proposed as a starting point for the homage rather than as a copied fact.
- **[CONFIRMED: press sheet + storefronts]** "Stats, achievements, and leaderboards" exist as a meta layer — DEFEND in particular is described as having "cooperative leaderboard scoring" (press sheet wording), implying DEFEND is scored by a running/high-score-style metric (e.g. waves survived, points before loss) rather than a discrete win/loss against the other player, consistent with it being a co-op mode rather than PvP.

**[CONFIRMED: App Store listing]** Only one of the two players needs the full (paid) version unlocked in order to play DEFEND and DEFLECT together with a friend on the free version — asymmetric unlock model. (Unclear if this extends to DUEL.)

**[CONFIRMED: App Store listing]** "Collectable color sets" unlock by playing against different people — a meta-progression/cosmetic layer tied to number of distinct opponents played, not raw playtime.

---

## 5. Feel and pacing

- **[INFERRED, general genre knowledge — NOT sourced from a DUAL-specific citation]** Based on the general "minimalist arcade duel" framing across all marketing copy (no screenshots could be visually inspected by these tools), the visual language is likely simple vector/neon shapes against a dark field with a distinct accent color per player/device — this is a reasonable assumption for the era/genre (2015 mobile indie) and is explicitly NOT to be treated as a confirmed fact, only as tonal context. The homage should design its own distinct visual identity regardless.
- **[CONFIRMED, indirectly]** "Multiple ships with unique abilities" (storefront tagline) plus the confirmed per-ship unique background art (v1.5.03 changelog: "new backgrounds during gameplay, one per ship") indicates the game reinforces ship identity/variety visually per-match, not just mechanically — a useful pacing/juice takeaway even without exact visual specifics.
- **[NOT CONFIRMED]** Screen shake, haptic/vibration feedback, the specific role sound cues play (e.g. whether a distinct sound plays specifically for "bullet crossed the seam between screens" as opposed to a generic fire/hit sound), one-hit-kill vs. health-bar-per-round, and the round intro/countdown flow (e.g. a 3-2-1 countdown, a synchronized "ready" handshake between devices before a round starts) — none of these were stated in any source reached (App Store/Play Store descriptions, press sheet, or the three located review pull-quotes). This is a real gap: these are exactly the kind of "feel" details usually only found in a full written review or in watching actual gameplay footage, and the YouTube videos located (see Section 8) could not be transcribed by the tools available here.
- **[REASONABLE INFERENCE, clearly flagged as inference, not fact]** Given DUEL is described as a "standoff" and the genre convention for twin-arena duel shooters of this era (Downwell-adjacent, "one clean hit ends it" arcade minimalism, short session length implied by "pick up and play"), a one-hit-kill-per-round model is plausible and is proposed as the DEFAULT assumption for the homage's Duel mode — but this is a design choice made under uncertainty, not a confirmed fact about the original.

---

## 6. Connection / pairing flow

- **[CONFIRMED: App Store listing + apkpure description]** Connection methods: WiFi (requires both devices on the same local network) and Bluetooth. A "Manual IP Discovery" fallback exists specifically for networks that block standard local-network/WiFi discovery — i.e. some public/corporate/guest WiFi networks isolate clients from seeing each other by default (AP/client isolation), and the game provides a manual-IP-entry workaround for exactly this case. This is a real, specific, and useful engineering detail to carry into the homage: **local WiFi discovery (e.g. mDNS/Bonjour-style broadcast) as the default, with a manual-IP fallback path for hostile networks.**
- **[CONFIRMED: apkpure description snapshot]** "Bluetooth functions as a beta feature with variable device compatibility" — i.e. even the original developer flagged Bluetooth as the less-reliable of the two connection paths, with WiFi being the primary/recommended method. A v1.5.04 changelog entry specifically calls out "Bluetooth fixes on iOS14," confirming Bluetooth connectivity was an ongoing source of platform-specific bugs across the game's life.
- **[CONFIRMED: press sheet + storefronts]** Cross-platform play is supported over WiFi — an iOS device and an Android device can play together (this is stated as a distinct, called-out feature, "Cross-platform play (iOS/Android via WiFi)," implying it may NOT extend to the Bluetooth connection path, since Bluetooth cross-platform pairing between iOS and Android has historically been more restrictive at the OS level than WiFi-based local networking).
- **[NOT CONFIRMED]** The exact step-by-step lobby/ready-up UX (e.g. does one device "host" and the other "join"? Is there a visible list of nearby games? Is there an explicit "ready" button per player before a round starts, or does the round begin automatically once connected?) was not described in any source reached. Flagged as an open question.

---

## 7. Screen-size / aspect-ratio handling

- **[CONFIRMED: App Store metadata]** The app is universal — it runs on both iPhone (iOS 11+) and iPad (iPadOS 11+), meaning the developer had to handle at least two very different screen sizes and aspect ratios, and per the cross-platform WiFi feature, a game could plausibly be played between an iPhone and an iPad (or an Android phone and an Android tablet) of substantially different physical dimensions.
- **[NOT CONFIRMED]** No source describes HOW size/aspect-ratio mismatches are actually handled in the shared coordinate space (e.g. does the game normalize both screens to a shared logical width so a bullet's horizontal position maps 1:1 by percentage rather than by pixel? does the smaller screen's "far edge" simply represent a proportionally larger slice of the shared arena?). This is a real technical gap in the sourced material. It is exactly the kind of hidden-but-load-bearing design decision the original solo developer would have had to solve, and it's flagged as a priority open question for the homage — most likely solution, and the one recommended in the Design Spec, is normalizing the play-field to a shared logical coordinate space (e.g. 0.0–1.0 or a fixed virtual unit width) rather than raw pixels, so gameplay-fairness doesn't depend on device size.

---

## 8. What reviewers praised

- **[CONFIRMED: App Store review excerpt via listing]** One reviewer quote captured: the game is "a really fun way to engage with another live human, up-close and personal" — praise centers on the social/physical-proximity novelty rather than a specific mechanical beat. Source: https://apps.apple.com/us/app/dual/id918902604
- **[CONFIRMED: App Store listing, aggregated]** Common critique themes from users: desire for a single-player/NPC mode (implying the base game is 2-device-only, no solo/AI practice), and desire for more than the three game modes.
- Rating snapshot: 4.1/5 aggregate (~2.4K ratings) on the App Store page fetched. Source: https://apps.apple.com/us/app/dual/id918902604
- Still need: TouchArcade / PocketGamer / AppSpy dedicated reviews (not yet located — TouchArcade's only DUAL coverage found so far is a one-line mention in an "Out Now" roundup, https://toucharcade.com/2015/04/01/new-iphone-games-april-2nd/, not a standalone review), Reddit threads (none found — the game appears to predate/sit outside major Reddit discussion, or discussion threads have aged out of search index), YouTube gameplay video commentary (two videos located — "DUAL! Gameplay Trailer" https://www.youtube.com/watch?v=wDXq3BHqYlI and "DUAL! - Gameplay - Multiplayer Duel [Android] HD" https://www.youtube.com/watch?v=Iq7-VC0Lzvg — but WebFetch could not retrieve YouTube's JS-rendered description/transcript content; video existence and titles are confirmed, content is not).
- **[CONFIRMED, via three separate outlet pull-quotes surfaced on the storefronts]**:
  - Destructoid (Chris Carter): "Working together right next to each other really brings back the magic of couch gaming." — praise targets the DEFEND co-op mode's physical-proximity teamwork specifically.
  - CNET (Rick Broida): "You play it with someone, anywhere, and it actually brings you closer together..." — also noted (per aggregated summary) that the reviewer felt DUAL "is exactly as complex as it needs to be, isn't trying to be game of the year" — i.e. praised for deliberate minimalism/scope discipline, not depth.
  - Kaijupop (Chris Charlton): "...sending bullets across to someone else's phone as you sit opposite them has a curious sense of technological magic to it." — this is the closest any source comes to describing the specific praised "moment": the reviewer frames the bullet-crossing-the-physical-gap event itself, not any secondary polish detail, as the game's emotional peak.
  - None of the three full original review articles could be located/fetched directly (search returns only the pull-quotes as reproduced on app-store pages) — full-length reviews were not confirmed to exist in the sources reachable here.

---

## 9. Character/ship roster (unlockable playstyle variants — new evidence)

**[CONFIRMED: version changelog text via apkpure.net version history, https://apkpure.net/es/dual/com.Seabaa.Dual/versions]** DUAL is not mechanically flat — it has multiple selectable "ships," each altering the bullet behavior in DUEL (and sometimes DEFLECT) mode. This is a meaningful finding for the homage: the base loop (tilt/move, charge, shoot, dodge) is constant, but each ship reskins the projectile behavior:

- **Default ship(s)**: baseline straight-shot bullets (implied by contrast with special ships; not separately named in sources found).
- **KOMAR** (added v1.3.03): fires a spray of small bullets that home in on the opponent; later updated so KOMAR's bullets *also* home in on the opponent's incoming bullets (bullet-vs-bullet interaction — i.e. your bullets can intercept/destroy enemy bullets).
- **Meduza** (added ~v1.4.00–1.4.02): fires bullets that leave the opponent "stunned"/briefly unable to act on hit, and these bullets bounce off the side walls of the screen (confirms side-wall bounce as a base physics rule at least for some bullet types — unclear if default bullets also bounce or only cross top/bottom edges).
- **JEZ** (added v1.5.00/1.5.03): fires explosive projectiles that do NOT detonate on contact alone — the firing player can remotely detonate them with a horizontal swipe gesture, adding a manual-trigger skill element. In DEFLECT mode, JEZ's special is repurposed: a horizontal swipe gives the ball itself a quick directional speed boost.
- Each ship also got a unique gameplay background (cosmetic, v1.5.03 changelog note).
- **[CONFIRMED]** The developer is a solo/one-person team (self-described in release notes, "single-person team causing update delays") — explains the slow, sporadic post-launch cadence (updates recorded from 2015 through as late as 2024 in the version history) and the small file size (~15-30MB across its life).

Source: https://apkpure.net/es/dual/com.Seabaa.Dual/versions (version history/changelog text, Spanish-localized on this mirror, translated above), cross-referenced with https://apkpure.com/dual/com.Seabaa.Dual and https://apk4fun.com/apk/44119/

---

## Design spec for the homage

A concrete, buildable spec synthesized from the confirmed facts above. Items marked **(OPEN)** are genuine unresolved questions — decide deliberately rather than guessing silently, since the original's specific answer could not be confirmed from any reachable source.

### A. Shared arena model
1. Model the two devices as ONE logical arena split by a shared seam, not two independently-rendered screens with a network relay bolted on. Use a single normalized coordinate space (e.g. x ∈ [0,1] horizontal, y spanning both devices) so gameplay fairness is independent of device size. **(OPEN, but this is the recommended solution — see Section 7)** how the original actually normalizes mismatched screen sizes was not confirmed.
2. **(OPEN)** Decide physical placement explicitly for the homage rather than assuming DUAL!'s (unconfirmed) layout: recommend phones stood upright, top edges touching, players seated facing each other across a table — each player's own screen is "their half," their near edge (bottom) is their own baseline, their far edge (top) is the seam where bullets exit toward the opponent.
3. A bullet that exits a player's far edge (the seam) should reappear at the opponent's far edge, continuing in a mapped/mirrored trajectory (same horizontal position, same relative angle) rather than resetting — this preserves the "one continuous flight" feeling that reviewers (Kaijupop) specifically called out as the emotional peak of the game.
4. **(OPEN)** Decide whether the opponent's ship is visible on your screen (as a shadow/silhouette near the seam) or fully hidden until their bullets appear — not confirmed for the original. Recommend building both as a toggleable option during prototyping and playtesting for feel, since this materially changes the skill ceiling (visible ship = can read opponent's aim/position; hidden ship = pure reaction to bullets, higher tension/surprise).

### B. Movement
5. Primary movement input: device tilt (accelerometer), mapped to horizontal position along the player's own baseline. **[CONFIRMED as at minimum the DUEL-mode scheme]**
6. **(OPEN)** Confirm whether other modes share this input or use touch-drag instead; default recommendation: keep tilt consistent across all three modes for input-language coherence, but allow a touch-drag accessibility/alternate control option since tilt-only can be uncomfortable for extended co-op sessions (DEFEND) — this is a design improvement, not a claim about the original.
7. Movement should be constrained to a 1D lane along the baseline (not free 2D) per the tilt-genre-convention inference in Section 2 — simplest to build, matches "duel/standoff" framing, and keeps the two-screen trajectory math tractable (a bullet only needs a single horizontal coordinate + a travel-time/speed to map cleanly across the seam).

### C. Shooting
8. Firing input: single tap. Holding extends a charge duration that increases shot power/speed/size (exact curve is a tuning question, not a copyable fact) — implement as a generic `holdDuration -> chargeLevel -0..1` continuous value, not discrete tiers, matching "tilt, dodge, CHARGE, and shoot" phrasing.
9. Build the bullet system as a **ship-defined behavior script**, not a single hardcoded bullet type — each selectable ship overrides: fire input mapping, spawn pattern, projectile motion/homing behavior, and any special secondary input (e.g. a swipe-to-detonate trigger). This directly mirrors the confirmed KOMAR (homing spray, later updated to intercept enemy bullets) / Meduza (stunning wall-bouncing shot) / JEZ (delayed-detonation projectile via horizontal swipe) pattern from the version history, and gives the homage the same "one core loop, many reskins" structure that let the original ship a small, sustainable roster over years as a solo dev.
10. **(OPEN)** Ammo economy: default recommendation — charge-gated fire rate (you cannot fire again until you release/recharge), no separate ammo pool, unlimited total shots. This was not confirmed for the original but is the simplest model consistent with "charge and shoot" and avoids a resource-management layer that isn't otherwise evidenced.
11. **(OPEN)** Bullet speed vs. ship speed / travel time across the two-screen gap: must be tuned via playtesting. Recommend erring toward a travel time long enough (several hundred ms at minimum) that the receiving player has a genuine reaction window — since the entire "the bullet crosses the physical gap between two real objects on a table" beat is the reviewed-and-praised core moment (Kaijupop), rushing it undersells the game's signature trick.

### D. Game modes
12. **DUEL** — 1v1. Each player has a charge-gated ship-specific weapon; movement is tilt-based lateral dodge; a hit ends the round (recommend one-hit-kill per round as the default per the "standoff" framing genre-convention — **(OPEN)**, not confirmed for the original). Winner determined by round wins; **(OPEN)** exact match structure (first-to-N / best-of-N / single round) — recommend first-to-5 or first-to-3 as a genre-standard default, explicitly a design choice not a sourced fact.
13. **DEFEND** — Co-op, 2 players vs. waves of attackers converging on a shared central objective spanning both screens. Scored via a shared running/high-score metric (waves survived or points), not a discrete win/loss — **[CONFIRMED via "cooperative leaderboard scoring" framing]**. Build as an endless-wave-survival mode with escalating enemy spawn rate/aggression over time.
14. **DEFLECT** — Competitive, ball-based. A single ball (not player-owned bullets) is shared across both screens; players "blast, bank, and curve" it toward a goal on the opponent's side. Recommend modeling as a physics object with speed/spin state that persists as it crosses the seam (mirroring bullet-crossing rules), and goals are scored when the ball reaches/enters a zone on the far side of a screen. Ship specials can modify the ball rather than spawning bullets (confirmed: JEZ's swipe-boost repurposes cleanly here).
15. **(OPEN)** Round-intro/ready-up flow, countdown, and any post-round summary screen are unconfirmed — recommend a simple synchronized 3-2-1 countdown broadcast to both devices once both players signal ready, since some explicit synchronization step is functionally necessary for two independent devices to start a shared-physics round in the same instant; this is a technical necessity inference, not a sourced fact.

### E. Connection / pairing
16. Primary connection path: local WiFi discovery (both devices on the same network, automatic peer discovery). **[CONFIRMED]**
17. Fallback: manual IP entry for networks with client isolation (hostile/public WiFi). **[CONFIRMED as a real, specific, worth-copying engineering feature]**
18. Secondary/optional path: Bluetooth — build this as explicitly lower-priority/best-effort given the original developer's own "beta" framing and the recurring platform-specific bugs noted across its changelog; don't over-invest engineering time matching Bluetooth reliability, since even the original never fully solved it.
19. Support cross-platform play (any two devices running the homage, regardless of OS) over WiFi, matching the confirmed original feature — this is a strong social/adoption feature worth preserving mechanically even though branding/art differs.

### F. Progression / meta layer (optional, lower priority)
20. **[CONFIRMED as a real feature of the original]** A light meta-progression layer existed: cosmetic unlocks (colors) tied to number of distinct opponents played (not raw playtime or wins), plus stats/achievements/leaderboards. Optional for a first playable build of the homage, but worth keeping in mind as a "why play again" hook — encourages playing with NEW people specifically, which reinforces the game's core social-proximity thesis rather than just its scoreboard.
21. Multiple selectable ships/characters as a content-drip structure (ship = one new bullet-behavior script), matching the original's slow solo-dev cadence of one new ship roughly every year or so — plan the homage's ship-behavior interface (item 9) to make adding a new ship cheap, since this is clearly how the original sustained content over a long tail with a one-person team.

### G. Explicitly open questions to resolve before/during build (do not silently assume)
- Exact phone-to-phone physical orientation (top-edge vs. side-edge placement).
- Whether the opponent's ship/position is visible on your own screen.
- Precise movement axis in DEFEND/DEFLECT (same tilt scheme as DUEL, or different).
- Ammo/charge economy numbers (caps, cooldowns).
- Bullet-speed-to-screen-gap timing (the core feel tuning knob).
- Round/match win structure (first-to-N, timer, sudden death).
- Round intro/countdown UX and any post-round screen.
- Screen-size/aspect-ratio normalization method for mismatched devices.
- Sound design's specific role (is there a unique "crossed the seam" cue distinct from generic fire/hit sounds?), haptics, and screen shake — entirely unconfirmed and left to the homage's own design process.
- One-hit-kill vs. health system in DUEL.

None of the above open items should be treated as license to invent "facts about the original" — they are gaps in what's confirmable from public sources, and the recommendations given are original design decisions for the homage, clearly labeled as such throughout this document.

---

## Source list

Primary sources fetched/consulted directly (via WebSearch and WebFetch):

1. https://seabaa.com/dual/ — developer's own DUAL landing page. Core description, three mode names/taglines, "simple one-touch controls," "multiple ships with unique abilities."
2. https://seabaa.com/dual/press/sheet.php?p=dual — press fact sheet. Full description, feature list, platforms, release date (April 2, 2015), monetization ($1.99 unlock), developer location (Chicago), press pull-quotes (Destructoid, Kaijupop), contact info, confirms letsdual.com as canonical URL (redirects to seabaa.com/dual/).
3. https://seabaa.com/dual/press/ — Sebastian Gosztyla's general press/developer profile page; confirmed DUAL project link but no additional standalone press release found.
4. http://letsdual.com — confirmed as a 301 redirect to seabaa.com/dual/ (same content, not a separate site).
5. https://apps.apple.com/us/app/dual/id918902604 — App Store listing. Mode descriptions, connection methods (WiFi/Bluetooth + Manual IP Discovery), asymmetric unlock model, collectible colors, stats/achievements/leaderboards, user review pull-quote, rating (4.1/5, ~2.4K ratings), iOS 11+ requirement, universal iPhone/iPad support, size (14.9 MB at time of fetch).
6. https://play.google.com/store/apps/details?id=com.Seabaa.Dual — Google Play listing (full body could not be fetched directly due to page truncation; cross-referenced via search-engine summaries and mirror sites instead).
7. https://apkpure.com/dual/com.Seabaa.Dual — mirror of Play Store description; confirmed Bluetooth "beta feature with variable device compatibility" line and Android version/size details (v1.6.00, 29.8 MB, Android 11+).
8. https://apkpure.net/es/dual/com.Seabaa.Dual/versions — Spanish-localized version-history/changelog mirror. Source of the ship-roster findings: KOMAR (v1.3.03, homing bullet spray, later updated to intercept enemy bullets), Meduza (v1.4.00–1.4.02, stunning wall-bouncing bullets), JEZ (v1.5.00/1.5.03, remote-detonated explosive projectile / ball-boost in Deflect), per-ship background art, solo-developer acknowledgment, Bluetooth iOS14 fix note.
9. https://www.amazon.com/Seabaa-DUAL/dp/B012FWGQG2 — Amazon Appstore listing (fetch returned HTTP 500; not directly readable, only referenced via search summaries).
10. https://androidcommunity.com/dual-multiplayer-game-lets-you-shoot-bullets-across-two-screens-20150403/ — 2015 launch-coverage article (fetch failed with connection error; only search-snippet summary available, confirms April 2015 timeframe and core "shoot bullets across two screens" framing).
11. https://toucharcade.com/2015/04/01/new-iphone-games-april-2nd/ — TouchArcade's only located DUAL coverage; a one-line mention in a roundup of that week's new iPhone releases, not a standalone review. No dedicated TouchArcade/PocketGamer/AppSpy review of DUAL could be located.
12. https://www.youtube.com/watch?v=wDXq3BHqYlI ("DUAL! Gameplay Trailer") and https://www.youtube.com/watch?v=Iq7-VC0Lzvg ("DUAL! - Gameplay - Multiplayer Duel [Android] HD") — both located and confirmed to exist via search; video description/transcript content could NOT be retrieved (WebFetch only returned YouTube's static navigation chrome, not the JS-rendered video metadata). Visual gameplay evidence from these videos is NOT reflected in this document.
13. Review pull-quotes for Destructoid (Chris Carter), CNET (Rick Broida), and Kaijupop (Chris Charlton) were only found as short quotes reproduced on the App Store/Google Play/press-sheet pages themselves — the original full-length review articles could not be located/fetched directly and may or may not still exist online in full.
14. https://appgrooves.com/app/dual-by-seabaa-inc — aggregator site; DNS/fetch failed directly (ENOTFOUND), only referenced via search-engine result snippets (rating aggregation, ~153K reviews claimed, review-highlight themes: desire for single-player/NPC mode, desire for more game modes).
15. https://mwm.ai/apps/dual/918902604 — third-party app-listing aggregator; successfully fetched, corroborated mode descriptions, connection details, and reviewer pull-quotes already found elsewhere.
16. No dedicated Reddit thread discussing DUAL! could be located via search.
17. Web Archive / Wayback Machine access was attempted for an older/2015-era snapshot of seabaa.com/dual to check for a more detailed original description, but the tool used here reported it could not fetch web.archive.org — this avenue is unexplored and could be a next step for future research.

**What was explicitly NOT found / could not be confirmed** (see "Open questions" list above for the mechanical implications): full third-party review text, any transcribed or visually-inspected gameplay footage, exact phone physical orientation, exact round/match structure, exact ammo economy, sound/haptic design specifics, screen-size-mismatch handling method, and lobby/pairing UX flow beyond the connection-method list.
