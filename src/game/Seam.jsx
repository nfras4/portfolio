// SEAM — hidden two-phone 1v1 duel. Route shell + phase machine:
// menu → host/join → connecting → select → countdown → round → score → end
// (→ rematch), plus a local "vs the machine" mode that runs a bot instead of
// a transport. Host is the referee (schedules rounds, tallies score); each
// phone is authoritative for its own ship and its own death.
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SignalClient } from "./net/signal.js";
import { createTransport } from "./net/transport.js";
import { encodeState, decodeState, seqNewer, PKT_STATE, ev } from "./net/protocol.js";
import {
  createSim, resetRound, advance, moveShip, startCharge, releaseCharge,
  spawnRemote, setOpp, setFighter, WIN_SCORE,
} from "./engine/sim.js";
import { slog } from "./net/log.js";
import { FIGHTERS, FIGHTER_IDS, getFighter } from "./engine/fighters.js";
import {
  createBot, resetBot, botUpdate, botSeePlayer, botReceiveSpawn,
  DIFFICULTIES, pickBotFighter,
} from "./engine/bot.js";
import { createRenderer, readColors, resize, draw, shake } from "./engine/render.js";
import { ensureAudio, sfx } from "./engine/audio.js";
import { qrPath } from "./qr.js";
import SeamDemo from "./Demo.jsx";
import "./seam.css";

const FORCE_RELAY =
  import.meta.env.DEV && typeof location !== "undefined" && location.search.includes("forcerelay");

// tilt tuning: degrees of tilt for full speed, and full-speed in arena units/s
const TILT_RANGE_DEG = 22;
const TILT_VX = 1.5;
const TILT_VY = 1.05;
const TILT_DEADZONE_DEG = 1.3; // sensor noise + hand tremor stay still
const TILT_SMOOTH = 0.3; // per-event low-pass factor

// The room id IS the 4-digit join code — QR and typed-code joins resolve to
// the same DO room by construction. Collisions with a concurrently active
// room surface as role!=="host" on connect and are retried with a new code;
// the code dies with the room (10-min idle alarm in the worker).
function genRoomCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 9000;
  return String(1000 + n);
}

function roomUrl(roomId) {
  const origin = import.meta.env.DEV ? location.origin : "https://nickwfraser.dev";
  return `${origin}/seam#r=${roomId}`;
}

function hashRoomId() {
  const m = /r=([a-z0-9]{4,64})/.exec(location.hash || "");
  return m ? m[1] : null;
}

// ---------- fight orientation (landscape) ----------

const FIGHT_PHASES = ["countdown", "round", "score"];

// Android path: orientation.lock needs fullscreen in most browsers; both are
// best-effort. iOS Safari supports neither — the CSS-rotation fallback in
// seam.css (.seam-root--rot) covers it. Must be called from a tap gesture.
async function acquireLandscape(rootEl) {
  try {
    if (rootEl && !document.fullscreenElement && rootEl.requestFullscreen) {
      await rootEl.requestFullscreen({ navigationUI: "hide" });
    }
  } catch {
    /* fullscreen refused — lock may still work, or the fallback handles it */
  }
  try {
    await screen.orientation.lock("landscape");
    slog("orient:locked", {});
    return true;
  } catch (e) {
    slog("orient:lock-failed", { err: String(e?.name || e) });
    return false;
  }
}

function releaseLandscape() {
  try {
    screen.orientation.unlock?.();
  } catch {
    /* was never locked */
  }
  if (document.fullscreenElement) {
    document.exitFullscreen?.().catch?.(() => {});
  }
}

// Map raw device-frame tilt (gamma/beta) into the SCREEN frame the player
// sees, so tilt-right always steers right regardless of how the fight got to
// landscape (real lock vs CSS-rotated fallback).
//   angle 270 ≡ device top pointing LEFT (also the CSS fallback's posture)
//   angle 90  ≡ device top pointing RIGHT
function effectiveTilt(R) {
  const t = R.tilt;
  if (t.sGamma == null) return null;
  let angle = 0;
  if (R.rotActive) {
    angle = 270;
  } else {
    const so = typeof screen !== "undefined" ? screen.orientation : null;
    if (so && /landscape/.test(so.type || "")) angle = so.angle === 90 ? 90 : 270;
  }
  if (angle === 90) return { g: -t.sBeta, b: t.sGamma };
  if (angle === 270) return { g: t.sBeta, b: -t.sGamma };
  return { g: t.sGamma, b: t.sBeta };
}

function isDesktop() {
  return (
    matchMedia("(pointer: fine)").matches &&
    !("ontouchstart" in window) &&
    (navigator.maxTouchPoints || 0) === 0
  );
}

function Qr({ text, className }) {
  const { d, size } = qrPath(text);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} aria-label="qr code">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

function Pips({ n, side }) {
  return (
    <div className={`seam-pips seam-pips--${side}`}>
      {Array.from({ length: WIN_SCORE }, (_, i) => (
        <span key={i} className={`seam-pip${i < n ? " on" : ""}`} />
      ))}
    </div>
  );
}

// ship glyphs, mirroring render.js drawShip — the picture IS the card
const SHIP_PATHS = {
  dart: "M0 -1.25 L1 0.75 L0 0.15 L-1 0.75 Z",
  swarm:
    "M0 -1.45 L0.55 0.35 L1.1 0.9 L0.25 0.55 L0 0.25 L-0.25 0.55 L-1.1 0.9 L-0.55 0.35 Z",
  orb: "M0 -1.05 L0.909 -0.525 L0.909 0.525 L0 1.05 L-0.909 0.525 L-0.909 -0.525 Z",
};

// Live tilt preview: a dot that moves as you tilt, so the sensor is proven
// working (and its direction learnable) before a round ever starts. The first
// reading after mount becomes the meter's own neutral, mirroring how the game
// calibrates at "go".
function TiltMeter({ game, avail }) {
  const dotRef = useRef(null);
  useEffect(() => {
    let raf = 0;
    let neutral = null;
    const tick = () => {
      const t = game.current.tilt;
      const d = dotRef.current;
      if (d && t.sGamma != null) {
        if (!neutral) neutral = { g: t.sGamma, b: t.sBeta };
        const nx = Math.max(-1, Math.min(1, (t.sGamma - neutral.g) / TILT_RANGE_DEG));
        const ny = Math.max(-1, Math.min(1, (t.sBeta - neutral.b) / TILT_RANGE_DEG));
        d.style.transform = `translate(${(nx * 26).toFixed(1)}px, ${(ny * 12).toFixed(1)}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [game]);
  return (
    <div className="seam-tiltmeter" aria-hidden="true">
      <div className="seam-tiltbox">
        <span ref={dotRef} className={`seam-tiltdot${avail ? " live" : ""}`} />
      </div>
      <span className="seam-tiltlabel">
        {avail ? "tilt your phone — the dot is you" : "waiting for motion…"}
      </span>
    </div>
  );
}

function FighterCard({ f, selected, locked, onPick }) {
  return (
    <button
      className={`seam-card seam-card--pic${selected ? " sel" : ""}`}
      data-fighter={f.id}
      disabled={locked}
      onClick={() => onPick(f.id)}
      aria-label={`${f.name} — ${f.shotDesc}; charge: ${f.chargeDesc}`}
    >
      <svg viewBox="-1.6 -1.8 3.2 3.4" className="seam-card-ship" aria-hidden="true">
        <path d={SHIP_PATHS[f.id] || SHIP_PATHS.dart} fill="currentColor" />
      </svg>
      <span className="seam-card-name">{f.name}</span>
    </button>
  );
}

export default function Seam() {
  const navigate = useNavigate();
  const [desktop] = useState(isDesktop);
  const [phase, setPhaseState] = useState("menu"); // menu|host|connecting|select|countdown|round|score|end
  const [roomId, setRoomId] = useState(null);
  const [kind, setKind] = useState(null); // "p2p" | "relay" | null (ai)
  const [count, setCount] = useState(3);
  const [score, setScore] = useState({ me: 0, them: 0 });
  const [splash, setSplash] = useState(null); // {title, sub}
  const [winner, setWinner] = useState(null); // "me" | "them"
  const [rematchWait, setRematchWait] = useState(false);
  const [peerGone, setPeerGone] = useState(null); // seconds left before exit
  const [error, setError] = useState(null);
  const [myFighter, setMyFighter] = useState(null);
  const [oppFighter, setOppFighter] = useState(null);
  const [lockedIn, setLockedIn] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [difficulty, setDifficulty] = useState("even");
  // DUAL!'s scheme: tilt is the default on a phone; touch is the opt-out
  const [controlMode, setControlMode] = useState(isDesktop() ? "keys" : "tilt"); // "touch" | "tilt" | "keys"
  const [tiltAvail, setTiltAvail] = useState(false);
  const [tiltNote, setTiltNote] = useState(null);
  const [rotFallback, setRotFallback] = useState(false); // CSS-rotated fight (portrait viewport, no lock)
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  // CRT power-on flash when arriving through the computer / brand gesture
  const [crtBoot, setCrtBoot] = useState(() => {
    try {
      if (sessionStorage.getItem("seam-boot")) {
        sessionStorage.removeItem("seam-boot");
        return true;
      }
    } catch {
      /* private mode */
    }
    return false;
  });

  const canvasRef = useRef(null);
  const rootRef = useRef(null);
  const refs = useRef({
    signal: null,
    transport: null,
    sim: createSim(),
    bot: null,
    renderer: null,
    raf: 0,
    sendTimer: 0,
    role: null,
    offset: 0, // host Date.now() − my Date.now()
    seq: 0,
    lastOppSeq: -1,
    phase: "menu",
    roundN: 0,
    roundResolved: false,
    tally: { host: 0, guest: 0 }, // host-side authority
    fighters: { me: null, them: null },
    rematch: { me: false, them: false },
    countTimer: 0,
    hostTimers: [],
    goneTimer: 0,
    wakeLock: null,
    pointerId: null,
    lastPointer: null,
    control: isDesktop() ? "keys" : "tilt",
    keys: { left: false, right: false, up: false, down: false },
    tilt: { gamma: null, beta: null, sGamma: null, sBeta: null, neutral: null },
    tiltGranted: false,
    rotActive: false, // CSS-rotated fallback engaged → remap touch + tilt
    locked: false, // screen.orientation.lock succeeded
    debug: {
      packetsIn: 0, packetsOut: 0, bulletsSpawned: 0, remoteBullets: 0,
      phase: "menu", kind: null,
    },
  });

  const setPhase = useCallback((p) => {
    refs.current.phase = p;
    refs.current.debug.phase = p;
    setPhaseState(p);
  }, []);

  useEffect(() => {
    window.__seamDebug = refs.current.debug;
  }, []);

  useEffect(() => {
    if (!crtBoot) return undefined;
    const t = setTimeout(() => {
      setCrtBoot(false);
      // the power-on animation scales the root — anything measured mid-boot
      // (canvas backing store!) is undersized; re-measure now that it's over
      window.dispatchEvent(new Event("resize"));
    }, 850);
    return () => clearTimeout(t);
  }, [crtBoot]);

  const hostNow = () => Date.now() + refs.current.offset;

  // Landscape fallback: during a fight on a portrait viewport (iOS Safari
  // can't lock orientation), rotate the stage 90° via CSS and remap inputs.
  // Rotating the phone for real flips the viewport to landscape and this
  // backs off automatically — so the fight LOOKS landscape either way, and a
  // mid-fight gyro flip just swaps which mechanism renders it.
  useEffect(() => {
    const R = refs.current;
    const compute = () => {
      const fighting = FIGHT_PHASES.includes(refs.current.phase);
      const portrait = matchMedia("(orientation: portrait)").matches;
      const rot = !desktop && fighting && portrait;
      if (rot !== R.rotActive) {
        R.rotActive = rot;
        R.debug.rot = rot;
        setRotFallback(rot);
        slog("orient:fallback", { rot });
        // stage geometry changed under the canvas — remeasure next frame
        requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
      }
    };
    compute();
    const mq = matchMedia("(orientation: portrait)");
    mq.addEventListener("change", compute);
    window.addEventListener("resize", compute);
    return () => {
      mq.removeEventListener("change", compute);
      window.removeEventListener("resize", compute);
    };
  }, [desktop, phase]);

  // ---------- match orchestration ----------

  const sendCountdown = useCallback(() => {
    const R = refs.current;
    if (R.role !== "host") return;
    R.roundResolved = false;
    R.roundN += 1;
    const startAt = Date.now() + 3400; // host clock; T+3s plus a beat of slack
    R.transport?.sendEvent(ev.countdown(R.roundN, startAt));
    handleCountdown({ round: R.roundN, startAt });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Host: the match can start once the clock is synced and both fighters are in.
  const maybeStart = useCallback(() => {
    const R = refs.current;
    if (R.role !== "host" || R.bot) return;
    if (!R.clockDone || !R.fighters.me || !R.fighters.them) return;
    if (R.roundN > 0) return; // already running
    sendCountdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCountdown = useCallback((msg) => {
    const R = refs.current;
    R.roundResolved = false;
    resetRound(R.sim);
    if (R.bot) resetBot(R.bot);
    setSplash(null);
    setRematchWait(false);
    setPhase("countdown");
    requestWakeLock(R);
    const localStart = msg.startAt - R.offset;
    let lastShown = 4;
    clearInterval(R.countTimer);
    R.countTimer = setInterval(() => {
      const left = (localStart - Date.now()) / 1000;
      const n = Math.max(0, Math.ceil(left));
      if (n !== lastShown) {
        lastShown = n;
        setCount(n);
        if (n > 0) sfx.beep(false);
      }
      if (left <= 0) {
        clearInterval(R.countTimer);
        sfx.beep(true);
        // tilt: this instant's orientation is "hands at rest" — calibrate in
        // the SCREEN frame so landscape (locked or CSS-rotated) maps right
        const eff = effectiveTilt(R);
        R.tilt.neutral = eff ? { g: eff.g, b: eff.b } : { g: 0, b: 0 };
        setPhase("round");
      }
    }, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Host-only: a round ended because someone died. winnerRole is "host"|"guest".
  const hostTally = useCallback((winnerRole) => {
    const R = refs.current;
    if (R.role !== "host" || R.roundResolved) return;
    R.roundResolved = true;
    R.tally[winnerRole] += 1;
    const msg = ev.score(R.tally.host, R.tally.guest);
    R.transport?.sendEvent(msg);
    handleScore(msg);
    const t = setTimeout(() => {
      if (R.tally[winnerRole] >= WIN_SCORE) {
        const endMsg = ev.end(winnerRole);
        R.transport?.sendEvent(endMsg);
        handleEnd(endMsg);
      } else {
        sendCountdown();
      }
    }, 2100);
    R.hostTimers.push(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScore = useCallback((msg) => {
    const R = refs.current;
    R.roundResolved = true;
    const mine = R.role === "host" ? msg.host : msg.guest;
    const theirs = R.role === "host" ? msg.guest : msg.host;
    const iWon = mine > (R.role === "host" ? R.lastHostScore || 0 : R.lastGuestScore || 0);
    R.lastHostScore = msg.host;
    R.lastGuestScore = msg.guest;
    setScore({ me: mine, them: theirs });
    R.debug.scoreMe = mine;
    R.debug.scoreThem = theirs;
    setSplash({
      title: iWon ? "round to you" : "round to them",
      sub: `${mine} — ${theirs}`,
    });
    if (iWon) sfx.win();
    setPhase("score");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnd = useCallback((msg) => {
    const R = refs.current;
    const me = msg.winner === R.role;
    setWinner(me ? "me" : "them");
    if (me) sfx.win();
    else sfx.lose();
    R.rematch = { me: false, them: false };
    setRematchWait(false);
    setPhase("end");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onGameEvent = useCallback((msg) => {
    const R = refs.current;
    switch (msg.t) {
      case "ping":
        R.transport?.sendEvent(ev.pong(msg.ts, Date.now()));
        break;
      case "pong": {
        const rtt = Date.now() - msg.ts;
        const sample = msg.now + rtt / 2 - Date.now();
        // keep the sample with the lowest rtt
        if (R.bestRtt === undefined || rtt < R.bestRtt) {
          R.bestRtt = rtt;
          R.offset = sample;
        }
        break;
      }
      case "clockdone":
        if (R.role === "host" && !R.clockDone) {
          R.clockDone = true;
          maybeStart();
        }
        break;
      case "fighter":
        R.fighters.them = msg.fid;
        R.sim.opp.fighter = msg.fid;
        R.debug.oppFighter = msg.fid;
        setOppFighter(msg.fid);
        if (R.role === "host") maybeStart();
        break;
      case "spawn": {
        if (R.phase !== "round") break;
        const lat = (hostNow() - msg.at) / 1000;
        spawnRemote(R.sim, msg, lat);
        R.debug.remoteBullets += 1;
        break;
      }
      case "hurt":
        // my shot connected — confirm tick + instant hp readout
        R.sim.opp.hp = msg.hp;
        R.debug.oppHp = msg.hp;
        sfx.tick();
        break;
      case "hit":
        // Peer announced its own death → if I'm host, tally it. (My own death
        // is handled locally in the loop and also routes into hostTally.)
        if (R.role === "host") hostTally("host");
        break;
      case "score":
        handleScore(msg);
        break;
      case "countdown":
        handleCountdown(msg);
        break;
      case "end":
        handleEnd(msg);
        break;
      case "rematch":
        R.rematch.them = true;
        if (R.role === "host" && R.rematch.me) startRematch();
        break;
      default:
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRematch = useCallback(() => {
    const R = refs.current;
    if (R.role !== "host") return;
    R.tally = { host: 0, guest: 0 };
    R.lastHostScore = 0;
    R.lastGuestScore = 0;
    R.rematch = { me: false, them: false };
    setScore({ me: 0, them: 0 });
    R.roundN = 0;
    sendCountdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPeerLeft = useCallback(() => {
    const R = refs.current;
    if (R.peerGoneActive || R.phase === "menu" || R.phase === "host" || R.bot) return;
    if (R.phase === "connecting") {
      if (R.role === "host") {
        // guest bounced before the match (e.g. dev StrictMode remount,
        // failed scan) — the QR is still valid, go back to waiting. The old
        // transport is spent (single-shot negotiation, possibly already
        // settled relay), so wire a fresh one for the next scanner.
        R.transport?.close();
        if (R.wireTransport) R.wireTransport();
        slog("host:transport-rebuilt", {});
        setPhase("host");
      } else {
        setError("lost the other phone");
        cleanup(R);
        resetToMenu();
      }
      return;
    }
    beginGoneCountdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beginGoneCountdown = useCallback(() => {
    const R = refs.current;
    if (R.peerGoneActive) return;
    R.peerGoneActive = true;
    let left = 15;
    setPeerGone(left);
    R.goneTimer = setInterval(() => {
      left -= 1;
      setPeerGone(left);
      if (left <= 0) {
        clearInterval(R.goneTimer);
        cleanup(refs.current);
        resetToMenu();
      }
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetToMenu = useCallback(() => {
    const R = refs.current;
    releaseLandscape();
    R.locked = false;
    R.peerGoneActive = false;
    R.role = null;
    R.offset = 0;
    R.bestRtt = undefined;
    R.clockDone = false;
    R.tally = { host: 0, guest: 0 };
    R.lastHostScore = 0;
    R.lastGuestScore = 0;
    R.roundN = 0;
    R.bot = null;
    R.fighters = { me: null, them: null };
    R.sim = createSim();
    if (R.renderer) R.sim.aspect = R.renderer.w / R.renderer.h;
    setScore({ me: 0, them: 0 });
    setKind(null);
    setPeerGone(null);
    setWinner(null);
    setSplash(null);
    setError(null);
    setRoomId(null);
    setMyFighter(null);
    setOppFighter(null);
    setLockedIn(false);
    setAiMode(false);
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    setPhase("menu");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- connection ----------

  // Returns "ok" | "collision" | "empty" | "error" so startHost can retry
  // 4-digit code collisions.
  const connectRoom = useCallback(async (id, joining) => {
    const R = refs.current;
    ensureAudio();
    setError(null);
    slog("join:start", { id, joining: !!joining });
    const signal = new SignalClient();
    R.signal = signal;
    let role;
    try {
      role = await signal.connect(id);
    } catch (err) {
      slog("join:signal-failed", { err: String(err?.message || err) });
      setError(joining ? "room full or expired" : "can't reach the signal server");
      setPhase("menu");
      return "error";
    }
    if (joining && role !== "guest") {
      // The host is gone; we'd be hosting a dead room. Bail.
      signal.close();
      slog("join:room-empty", { id });
      setError("that room is empty or expired — check the code or host a new duel");
      setPhase("menu");
      return "empty";
    }
    if (!joining && role !== "host") {
      // someone else is already hosting on this 4-digit code — caller retries
      signal.close();
      slog("host:code-collision", { id });
      return "collision";
    }
    R.role = role;
    R.debug.role = role;

    const onTransportConnected = async (k) => {
      R.debug.kind = k;
      slog("transport:up", { kind: k, role });
      // pick fighters while the clock syncs underneath
      setPhase("select");
      // my fighter may already be locked (host picked while waiting for the scan)
      if (R.fighters.me) R.transport?.sendEvent(ev.fighter(R.fighters.me));
      if (role === "guest") {
        for (let i = 0; i < 3; i++) {
          R.transport?.sendEvent(ev.ping(Date.now()));
          await new Promise((res) => setTimeout(res, 130));
        }
        R.transport?.sendEvent({ t: "clockdone" });
      } else {
        // fallback: if clockdone never arrives, start anyway once fighters are in
        const t = setTimeout(() => {
          if (!R.clockDone) {
            R.clockDone = true;
            maybeStart();
          }
        }, 3000);
        R.hostTimers.push(t);
      }
    };

    // WebRTC negotiation is single-shot per transport, so each guest attempt
    // needs a FRESH transport. Kept re-callable: onPeerLeft rebuilds via
    // R.wireTransport when a guest bounces mid-handshake (the old spent
    // transport swallowing the next guest's "ready" was why pairing used to
    // work only on the second scan).
    const wireTransport = () => {
      const transport = createTransport({ signal, role, forceRelay: FORCE_RELAY });
      R.transport = transport;
      R.lastOppSeq = -1;
      transport.onSignal = (msg) => {
        if (msg.t === "peer-joined") {
          slog("host:peer-joined", {});
          setPhase("connecting");
          // guest's "ready" will start negotiation
        } else if (msg.t === "peer-left") {
          onPeerLeft();
        } else if (msg.t === "ready") {
          slog("host:ready-recv", {});
          transport.begin();
        }
      };
      transport.onEvent = onGameEvent;
      transport.onState = (buf) => {
        const p = decodeState(buf);
        if (p.type !== PKT_STATE) return;
        if (R.lastOppSeq >= 0 && !seqNewer(p.seq, R.lastOppSeq)) return;
        R.lastOppSeq = p.seq;
        setOpp(R.sim, p.x, p.vx, p.charge, p.y, undefined, p.hp);
        R.debug.packetsIn += 1;
      };
      transport.onKind = (k) => {
        setKind(k);
        R.debug.kind = k;
      };
      transport.connected.then((k) => {
        if (R.transport !== transport) return; // superseded by a rebuild
        onTransportConnected(k);
      });
      return transport;
    };
    R.wireTransport = wireTransport;
    wireTransport();
    signal.onClose = () => onPeerLeft();

    if (role === "guest") {
      setPhase("connecting");
      signal.send(ev.ready()); // raw signaling message (not relay-wrapped)
      slog("guest:ready-sent", {});
      R.transport.begin();
    } else {
      setPhase(joining ? "connecting" : "host");
    }
    return "ok";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startHost = useCallback(async () => {
    ensureTiltReady(); // this tap is the iOS permission gesture
    for (let attempt = 0; attempt < 8; attempt++) {
      const id = genRoomCode();
      setRoomId(id);
      const res = await connectRoom(id, false);
      if (res === "ok") return;
      if (res !== "collision") return; // real error — already surfaced
      slog("host:retry", { attempt });
    }
    setError("couldn't grab a free room code — try again");
    setPhase("menu");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinByCode = useCallback((code) => {
    if (!/^\d{4}$/.test(code || "")) return;
    ensureTiltReady(); // this tap is the iOS permission gesture
    slog("join:by-code", { code });
    setPhase("connecting");
    connectRoom(code, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- vs the machine ----------

  const startAiSelect = useCallback(() => {
    const R = refs.current;
    ensureAudio();
    ensureTiltReady(); // this tap is the iOS permission gesture
    setAiMode(true);
    R.role = "host";
    R.debug.role = "host";
    R.debug.kind = "ai";
    setPhase("select");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAiMatch = useCallback(async () => {
    const R = refs.current;
    if (!R.fighters.me) return;
    if (!desktop) acquireLandscape(rootRef.current).then((ok) => { R.locked = ok; });
    await ensureTiltReady(); // last chance to grant motion before the round
    const botFighter = pickBotFighter(R.fighters.me);
    R.bot = createBot(difficulty, botFighter);
    R.fighters.them = botFighter;
    R.sim.opp.fighter = botFighter;
    R.debug.oppFighter = botFighter;
    setOppFighter(botFighter);
    R.tally = { host: 0, guest: 0 };
    R.roundN = 0;
    sendCountdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  // auto-join if the URL carries a room fragment. Cleanup tears the connection
  // down so StrictMode's dev double-mount reconnects cleanly instead of
  // occupying the room twice.
  useEffect(() => {
    const id = hashRoomId();
    if (!id) return undefined;
    setPhase("connecting");
    connectRoom(id, true);
    return () => cleanup(refs.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- tilt (gyro) ----------

  useEffect(() => {
    if (desktop) return undefined;
    const R = refs.current;
    const onOrient = (e) => {
      if (e.gamma === null || e.gamma === undefined) return;
      // upside-down portrait flips both axes relative to what the player sees
      const flip =
        typeof screen !== "undefined" &&
        screen.orientation?.type === "portrait-secondary"
          ? -1
          : 1;
      const g = e.gamma * flip;
      const b = e.beta * flip;
      R.tilt.gamma = g;
      R.tilt.beta = b;
      // low-pass: phone orientation sensors jitter at 60 Hz
      R.tilt.sGamma = R.tilt.sGamma == null ? g : R.tilt.sGamma + TILT_SMOOTH * (g - R.tilt.sGamma);
      R.tilt.sBeta = R.tilt.sBeta == null ? b : R.tilt.sBeta + TILT_SMOOTH * (b - R.tilt.sBeta);
      // first live reading proves the sensor exists
      setTiltAvail((v) => v || true);
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [desktop]);

  // iOS: motion access needs a same-gesture requestPermission. Returns
  // true (usable), false (explicitly denied), or null (couldn't ask —
  // not a gesture; try again on the next tap).
  const requestTiltPermission = useCallback(async () => {
    const R = refs.current;
    if (
      typeof DeviceOrientationEvent === "undefined" ||
      typeof DeviceOrientationEvent.requestPermission !== "function"
    ) {
      return true; // Android / older iOS: events just flow
    }
    if (R.tiltGranted) return true;
    try {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res === "granted") {
        R.tiltGranted = true;
        return true;
      }
      return false;
    } catch {
      return null;
    }
  }, []);

  const fallBackToTouch = useCallback((note) => {
    const R = refs.current;
    R.control = "touch";
    setControlMode("touch");
    setTiltNote(note);
  }, []);

  // Called inside a tap handler while tilt is the chosen scheme: ask iOS for
  // motion access if we haven't; on refusal drop to touch (the match still
  // plays). Never blocks a match from starting.
  const ensureTiltReady = useCallback(async () => {
    const R = refs.current;
    if (desktop || R.control !== "tilt") return;
    const ok = await requestTiltPermission();
    if (ok === false) fallBackToTouch("motion access denied — using touch");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop]);

  const chooseControl = useCallback(async (mode) => {
    const R = refs.current;
    R.controlChosen = true;
    if (mode === "tilt") {
      const ok = await requestTiltPermission();
      if (ok === false) {
        fallBackToTouch("motion access denied — using touch");
        return;
      }
    }
    setTiltNote(null);
    R.control = mode;
    setControlMode(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickFighter = useCallback((fid) => {
    const R = refs.current;
    R.fighters.me = fid;
    R.debug.fighter = fid;
    setFighter(R.sim, fid);
    setMyFighter(fid);
  }, []);

  const lockFighter = useCallback(async () => {
    const R = refs.current;
    if (!R.fighters.me) return;
    if (!desktop) acquireLandscape(rootRef.current).then((ok) => { R.locked = ok; });
    await ensureTiltReady(); // guests join via URL — this tap is their gesture
    setLockedIn(true);
    R.transport?.sendEvent(ev.fighter(R.fighters.me));
    if (R.role === "host") maybeStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- game loop ----------

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const R = refs.current;
    R.renderer = createRenderer(canvas);
    R.sim.aspect = R.renderer.w / R.renderer.h;

    const onResize = () => {
      resize(R.renderer);
      readColors(R.renderer);
      R.sim.aspect = R.renderer.w / R.renderer.h;
    };
    window.addEventListener("resize", onResize);

    let last = performance.now();
    let lastSizeCheck = 0;
    const frame = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      // self-healing size: the CRT boot animation scales the root, so any
      // measurement taken mid-boot undersizes the backing store. Cheap
      // half-second check beats trusting one perfectly-timed remeasure.
      if (now - lastSizeCheck > 500) {
        lastSizeCheck = now;
        // clientWidth/Height: layout size, immune to the rotated stage's
        // transform (a rotated element's bounding rect has w/h swapped)
        if (
          Math.abs(canvas.clientWidth - R.renderer.w) > 1 ||
          Math.abs(canvas.clientHeight - R.renderer.h) > 1
        ) {
          onResize();
        }
      }
      if (R.phase === "round") {
        // keyboard steering (desktop)
        if (R.control === "keys") {
          const kx = (R.keys.right ? 1 : 0) - (R.keys.left ? 1 : 0);
          const ky = (R.keys.up ? 1 : 0) - (R.keys.down ? 1 : 0);
          if (kx || ky) {
            const n = kx && ky ? Math.SQRT1_2 : 1; // diagonals not faster
            const vx = kx * TILT_VX * n;
            const vy = ky * TILT_VY * n;
            moveShip(R.sim, vx * dt, vy * dt, vx, vy);
          }
        }
        // tilt steering: relative to the neutral captured at "go", smoothed,
        // with a deadzone so a resting hand holds still. effectiveTilt maps
        // the device axes into the screen frame the player actually sees.
        if (R.control === "tilt" && R.tilt.neutral) {
          const eff = effectiveTilt(R);
          if (eff) {
            const shape = (raw) => {
              const c = Math.max(-TILT_RANGE_DEG, Math.min(TILT_RANGE_DEG, raw));
              const m = Math.abs(c);
              if (m < TILT_DEADZONE_DEG) return 0;
              return (Math.sign(c) * (m - TILT_DEADZONE_DEG)) / (TILT_RANGE_DEG - TILT_DEADZONE_DEG);
            };
            const vx = shape(eff.g - R.tilt.neutral.g) * TILT_VX;
            const vy = -shape(eff.b - R.tilt.neutral.b) * TILT_VY; // tilt top AWAY = advance
            if (vx || vy) moveShip(R.sim, vx * dt, vy * dt, vx, vy);
          }
        }

        const events = advance(R.sim, dt);
        for (const e of events) {
          if (e.type === "cross") sfx.tick();
          else if (e.type === "split") sfx.tick();
          else if (e.type === "hurt") {
            sfx.hurt();
            shake(R.renderer);
            if (navigator.vibrate) navigator.vibrate(30);
            R.transport?.sendEvent(ev.hurt(R.sim.me.hp));
          } else if (e.type === "hit") {
            sfx.thud();
            shake(R.renderer);
            if (navigator.vibrate) navigator.vibrate(60);
            R.transport?.sendEvent(ev.hit(e.bullet.id));
            if (R.role === "host") hostTally("guest");
          }
        }

        // the machine plays its half
        if (R.bot) {
          botSeePlayer(
            R.bot,
            R.sim.me.x, R.sim.me.vx,
            R.sim.me.charging ? R.sim.me.charge : 0,
            R.sim.me.y
          );
          const { events: botEvents, spawns } = botUpdate(R.bot, dt);
          for (const msg of spawns) {
            spawnRemote(R.sim, msg, 0);
            R.debug.remoteBullets += 1;
          }
          setOpp(
            R.sim,
            R.bot.sim.me.x, R.bot.sim.me.vx,
            R.bot.sim.me.charging ? R.bot.sim.me.charge : 0,
            R.bot.sim.me.y, R.bot.fighterId, R.bot.sim.me.hp
          );
          for (const e of botEvents) {
            if (e.type === "hurt") sfx.tick(); // chipped the machine
            else if (e.type === "hit") {
              // the machine died
              sfx.thud();
              hostTally("host");
            }
          }
        }

        R.debug.ammo = R.sim.me.ammo;
        R.debug.hp = R.sim.me.hp;
        R.debug.oppHp = R.sim.opp.hp;
        R.debug.shipX = R.sim.me.x;
        R.debug.shipY = R.sim.me.y;
        R.debug.control = R.control;
      }
      draw(R.renderer, R.sim, R.phase === "round" || R.phase === "countdown" || R.phase === "score");
      R.raf = requestAnimationFrame(frame);
    };
    R.raf = requestAnimationFrame(frame);

    // 30 Hz ship-state sender
    R.sendTimer = setInterval(() => {
      if (R.phase !== "round" || !R.transport || R.transport.kind === "connecting") return;
      R.transport.sendState(
        encodeState(
          R.seq++ & 0xffff,
          R.sim.me.x, R.sim.me.y, R.sim.me.vx, R.sim.me.vy,
          R.sim.me.charging ? R.sim.me.charge : 0,
          R.sim.me.hp
        )
      );
      R.debug.packetsOut += 1;
    }, 33);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(R.raf);
      clearInterval(R.sendTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop]);

  // unmount cleanup
  useEffect(() => {
    return () => cleanup(refs.current);
  }, []);

  // ---------- input ----------

  const onPointerDown = useCallback((e) => {
    const R = refs.current;
    ensureAudio();
    if (R.phase !== "round" || R.pointerId !== null) return;
    R.pointerId = e.pointerId;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* synthetic/withdrawn pointers can't be captured — input still works */
    }
    R.lastPointer = { x: e.clientX, y: e.clientY, t: performance.now() };
    if (!startCharge(R.sim) && R.sim.me.ammo < 1) sfx.dry();
  }, []);

  const onPointerMove = useCallback((e) => {
    const R = refs.current;
    if (e.pointerId !== R.pointerId || !R.lastPointer) return;
    // tilt steers and the finger only fires — but if the sensor has never
    // produced a reading (no gyro, blocked permission), drag must still steer
    // or the ship is a brick
    if (R.control === "tilt" && R.tilt.gamma !== null) return;
    const now = performance.now();
    const dtMove = Math.max(1, now - R.lastPointer.t) / 1000;
    const w = R.renderer?.w || 1;
    const h = R.renderer?.h || 1;
    const dxc = e.clientX - R.lastPointer.x;
    const dyc = e.clientY - R.lastPointer.y;
    // rotated fallback: the stage is turned 90° cw and the player holds the
    // phone sideways, so player-right = viewport-down, player-up = viewport-left
    const px = R.rotActive ? dyc : dxc;
    const py = R.rotActive ? -dxc : dyc;
    const dx = (px / w) * 1.4;
    const dy = (-py / h) * 1.2; // screen up = arena up
    const vx = Math.max(-3, Math.min(3, dx / dtMove));
    const vy = Math.max(-3, Math.min(3, dy / dtMove));
    moveShip(R.sim, dx, dy, vx, vy);
    R.lastPointer = { x: e.clientX, y: e.clientY, t: now };
  }, []);

  const fireRelease = useCallback(() => {
    const R = refs.current;
    const spawned = releaseCharge(R.sim);
    for (const spawn of spawned) {
      sfx.fire(spawn.charge);
      R.transport?.sendEvent(ev.spawn(spawn, hostNow()));
      if (R.bot) botReceiveSpawn(R.bot, spawn);
      R.debug.bulletsSpawned += 1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerUp = useCallback((e) => {
    const R = refs.current;
    if (e.pointerId !== R.pointerId) return;
    R.pointerId = null;
    R.lastPointer = null;
    fireRelease();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // desktop: arrows/WASD move, space charges + fires on release
  useEffect(() => {
    const R = refs.current;
    const codeMap = {
      ArrowLeft: "left", KeyA: "left",
      ArrowRight: "right", KeyD: "right",
      ArrowUp: "up", KeyW: "up",
      ArrowDown: "down", KeyS: "down",
    };
    const inMatch = () => R.phase === "round" || R.phase === "countdown";
    const onDown = (e) => {
      const dir = codeMap[e.code];
      if (dir) {
        if (inMatch()) e.preventDefault();
        R.keys[dir] = true;
        return;
      }
      if (e.code === "Space" && inMatch()) {
        e.preventDefault(); // keep space from re-clicking a focused button
        if (e.repeat) return;
        ensureAudio();
        if (R.phase === "round" && !startCharge(R.sim) && R.sim.me.ammo < 1) sfx.dry();
      }
    };
    const onUp = (e) => {
      const dir = codeMap[e.code];
      if (dir) {
        R.keys[dir] = false;
        return;
      }
      if (e.code === "Space" && R.phase === "round") {
        e.preventDefault();
        fireRelease();
      }
    };
    const onBlur = () => {
      R.keys.left = R.keys.right = R.keys.up = R.keys.down = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- render ----------

  const exitBtn = (
    <button
      className="seam-exit"
      onClick={() => {
        cleanup(refs.current);
        navigate("/");
      }}
    >
      ← exit
    </button>
  );

  const vsLine =
    myFighter && oppFighter ? `${myFighter} vs ${oppFighter}` : null;

  const fighting = FIGHT_PHASES.includes(phase);

  return (
    <div
      ref={rootRef}
      className={
        `seam-root${desktop ? " seam-root--desktop" : ""}${crtBoot ? " seam-root--crtboot" : ""}` +
        `${fighting ? " seam-root--fight" : ""}${rotFallback ? " seam-root--rot" : ""}`
      }
    >
      {/* the stage holds everything that must flip to landscape as one unit */}
      <div className="seam-stage">
        <canvas
          ref={canvasRef}
          className="seam-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {(phase === "countdown" || phase === "round" || phase === "score") && (
          <div className="seam-hud">
            {exitBtn}
            {kind && <span className="seam-badge">{kind}</span>}
            <Pips n={score.me} side="me" />
            <Pips n={score.them} side="them" />
            {phase === "countdown" && (
              <div className="seam-count">
                {count > 0 ? count : "go"}
                {vsLine && <small className="seam-vs">{vsLine}</small>}
              </div>
            )}
            {phase === "score" && splash && (
              <div className="seam-splash">
                <span>{splash.title}</span>
                <small>{splash.sub}</small>
              </div>
            )}
          </div>
        )}
      </div>

      {phase === "menu" && (
        <div className="seam-center">
          <div className="seam-title">seam<span className="seam-slash"> /</span></div>
          <p className="seam-sub">
            a duel across two phones. bullets fired off the top of your screen
            come down on theirs.
          </p>
          <SeamDemo />
          {error && <p className="seam-sub" style={{ color: "var(--accent)" }}>{error}</p>}
          <button className="seam-btn seam-btn--primary" onClick={startHost}>
            host a duel
          </button>
          <button className="seam-btn seam-btn--primary seam-btn--ai" onClick={startAiSelect}>
            fight the machine
          </button>
          {showJoin ? (
            <form
              className="seam-joinrow"
              onSubmit={(e) => {
                e.preventDefault();
                joinByCode(joinCode);
              }}
            >
              <input
                className="seam-codeinput"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="0000"
                autoFocus
                aria-label="room code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
              <button
                type="submit"
                className="seam-btn seam-btn--primary"
                disabled={joinCode.length !== 4}
              >
                join
              </button>
            </form>
          ) : (
            <button className="seam-btn" onClick={() => setShowJoin(true)}>
              join with a code
            </button>
          )}
          <p className="seam-sub">
            {desktop
              ? "a phone scans the qr or types the code to join — or fight the machine right here with arrows + space"
              : "the other phone joins by scanning or typing the code — nothing to install"}
          </p>
          <button className="seam-btn" onClick={() => navigate("/")}>← back to portfolio</button>
        </div>
      )}

      {phase === "host" && roomId && (
        <div className="seam-center" data-room-url={roomUrl(roomId)} data-room-code={roomId}>
          <p className="seam-sub">scan with the other phone's camera</p>
          <div className="seam-qr"><Qr text={roomUrl(roomId)} /></div>
          <div className="seam-code">{roomId}</div>
          <p className="seam-sub">or type this code under “join with a code”</p>
          <p className="seam-sub seam-dots">waiting for your opponent</p>
          <button className="seam-btn" onClick={() => { cleanup(refs.current); resetToMenu(); }}>
            cancel
          </button>
        </div>
      )}

      {phase === "connecting" && (
        <div className="seam-center">
          <div className="seam-title">seam<span className="seam-slash"> /</span></div>
          <p className="seam-sub seam-dots">connecting</p>
        </div>
      )}

      {phase === "select" && (
        <div className="seam-center seam-select">
          <p className="seam-sub seam-select-head">choose your fighter</p>
          <div className="seam-cards">
            {FIGHTER_IDS.map((fid) => (
              <FighterCard
                key={fid}
                f={FIGHTERS[fid]}
                selected={myFighter === fid}
                locked={lockedIn}
                onPick={pickFighter}
              />
            ))}
          </div>

          {desktop ? (
            <p className="seam-hint">arrows / wasd move · space shoots, hold to charge</p>
          ) : (
            <>
              <div className="seam-chiprow" role="group" aria-label="controls">
                <span className="seam-chiplabel">controls</span>
                <button
                  className={`seam-chip${controlMode === "tilt" ? " on" : ""}`}
                  onClick={() => chooseControl("tilt")}
                >
                  tilt
                </button>
                <button
                  className={`seam-chip${controlMode === "touch" ? " on" : ""}`}
                  onClick={() => chooseControl("touch")}
                >
                  touch
                </button>
              </div>
              {controlMode === "tilt" && (
                <>
                  <TiltMeter game={refs} avail={tiltAvail} />
                  <p className="seam-hint">
                    tilt steers, finger fires — hold the phone comfy at “go”,
                    that pose is your center
                  </p>
                </>
              )}
              {tiltNote && <p className="seam-hint seam-hint--warn">{tiltNote}</p>}
            </>
          )}

          {aiMode ? (
            <>
              <div className="seam-chiprow" role="group" aria-label="difficulty">
                <span className="seam-chiplabel">machine</span>
                {Object.keys(DIFFICULTIES).map((d) => (
                  <button
                    key={d}
                    className={`seam-chip${difficulty === d ? " on" : ""}`}
                    onClick={() => setDifficulty(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <button
                className="seam-btn seam-btn--primary seam-lock"
                disabled={!myFighter}
                onClick={startAiMatch}
              >
                fight
              </button>
              <button className="seam-btn" onClick={() => { cleanup(refs.current); resetToMenu(); }}>
                back
              </button>
            </>
          ) : (
            <>
              <button
                className="seam-btn seam-btn--primary seam-lock"
                disabled={!myFighter || lockedIn}
                onClick={lockFighter}
              >
                {lockedIn ? (oppFighter ? "starting…" : "waiting for opponent…") : "lock in"}
              </button>
              {lockedIn && oppFighter && (
                <p className="seam-sub">they picked {oppFighter}</p>
              )}
              <button
                className="seam-btn"
                onClick={() => {
                  cleanup(refs.current);
                  navigate("/");
                }}
              >
                ← back to portfolio
              </button>
            </>
          )}
        </div>
      )}

      {phase === "end" && (
        <div className="seam-center">
          <div className="seam-title">
            {winner === "me" ? "you win" : aiMode ? "the machine wins" : "they win"}
          </div>
          <p className="seam-sub">{score.me} — {score.them}</p>
          <button
            className="seam-btn seam-btn--primary"
            onClick={() => {
              const R = refs.current;
              // this tap can restore landscape if the lock lapsed (back
              // gesture, fullscreen exit) — best-effort like the original
              if (!desktop && !R.locked) {
                acquireLandscape(rootRef.current).then((ok) => { R.locked = ok; });
              }
              if (R.bot) {
                R.tally = { host: 0, guest: 0 };
                R.lastHostScore = 0;
                R.lastGuestScore = 0;
                setScore({ me: 0, them: 0 });
                R.roundN = 0;
                sendCountdown();
                return;
              }
              R.rematch.me = true;
              R.transport?.sendEvent(ev.rematch());
              setRematchWait(true);
              if (R.role === "host" && R.rematch.them) startRematch();
            }}
            disabled={rematchWait}
          >
            {rematchWait ? "waiting…" : "rematch"}
          </button>
          <button className="seam-btn" onClick={() => { cleanup(refs.current); navigate("/"); }}>
            ← back to portfolio
          </button>
        </div>
      )}

      {peerGone !== null && (
        <div className="seam-overlay">
          <div className="seam-title">opponent left</div>
          <p className="seam-sub">back to menu in {peerGone}s</p>
          <button
            className="seam-btn"
            onClick={() => {
              clearInterval(refs.current.goneTimer);
              cleanup(refs.current);
              resetToMenu();
            }}
          >
            leave now
          </button>
        </div>
      )}

      {rotFallback && (
        <div className="seam-rotate">rotate your phone — fights play landscape</div>
      )}
    </div>
  );
}

// ---------- helpers outside the component ----------

function requestWakeLock(R) {
  if (R.wakeLock) return;
  navigator.wakeLock
    ?.request("screen")
    .then((lock) => {
      R.wakeLock = lock;
      lock.addEventListener("release", () => {
        if (R.wakeLock === lock) R.wakeLock = null;
      });
    })
    .catch(() => {
      /* non-fatal: screen may dim, game still works */
    });
}

function cleanup(R) {
  releaseLandscape();
  R.locked = false;
  clearInterval(R.countTimer);
  clearInterval(R.goneTimer);
  R.hostTimers?.forEach(clearTimeout);
  R.hostTimers = [];
  R.transport?.close();
  R.transport = null;
  R.signal?.close();
  R.signal = null;
  R.bot = null;
  R.wakeLock?.release?.().catch?.(() => {});
  R.wakeLock = null;
  R.lastOppSeq = -1;
}
