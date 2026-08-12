// SEAM — hidden two-phone 1v1 duel. Route shell + phase machine:
// menu → host/join → connecting → countdown → round → score → end (→ rematch).
// Host is the referee (schedules rounds, tallies score); each phone is
// authoritative for its own ship and its own death.
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SignalClient } from "./net/signal.js";
import { createTransport } from "./net/transport.js";
import { encodeState, decodeState, seqNewer, PKT_STATE, ev } from "./net/protocol.js";
import {
  createSim, resetRound, advance, moveShip, startCharge, releaseCharge,
  spawnRemote, setOpp,
} from "./engine/sim.js";
import { createRenderer, readColors, resize, draw, shake } from "./engine/render.js";
import { ensureAudio, sfx } from "./engine/audio.js";
import { qrPath } from "./qr.js";
import "./seam.css";

const WIN_SCORE = 5;
const FORCE_RELAY =
  import.meta.env.DEV && typeof location !== "undefined" && location.search.includes("forcerelay");

function genRoomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16)); // 128 bits
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  return n.toString(36).padStart(8, "0");
}

function roomUrl(roomId) {
  const origin = import.meta.env.DEV ? location.origin : "https://nickwfraser.dev";
  return `${origin}/seam#r=${roomId}`;
}

function hashRoomId() {
  const m = /r=([a-z0-9]{8,64})/.exec(location.hash || "");
  return m ? m[1] : null;
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

export default function Seam() {
  const navigate = useNavigate();
  const [desktop] = useState(isDesktop);
  const [phase, setPhaseState] = useState("menu"); // menu|host|connecting|countdown|round|score|end
  const [roomId, setRoomId] = useState(null);
  const [kind, setKind] = useState(null); // "p2p" | "relay"
  const [count, setCount] = useState(3);
  const [score, setScore] = useState({ me: 0, them: 0 });
  const [splash, setSplash] = useState(null); // {title, sub}
  const [winner, setWinner] = useState(null); // "me" | "them"
  const [rematchWait, setRematchWait] = useState(false);
  const [peerGone, setPeerGone] = useState(null); // seconds left before exit
  const [error, setError] = useState(null);

  const canvasRef = useRef(null);
  const refs = useRef({
    signal: null,
    transport: null,
    sim: createSim(),
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
    rematch: { me: false, them: false },
    countTimer: 0,
    hostTimers: [],
    goneTimer: 0,
    wakeLock: null,
    pointerId: null,
    lastPointer: null,
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

  const hostNow = () => Date.now() + refs.current.offset;

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

  const handleCountdown = useCallback((msg) => {
    const R = refs.current;
    R.roundResolved = false;
    resetRound(R.sim);
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
          sendCountdown();
        }
        break;
      case "spawn": {
        if (R.phase !== "round") break;
        const lat = (hostNow() - msg.at) / 1000;
        spawnRemote(R.sim, msg, lat);
        R.debug.remoteBullets += 1;
        break;
      }
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
    if (R.peerGoneActive || R.phase === "menu" || R.phase === "host") return;
    if (R.phase === "connecting") {
      if (R.role === "host") {
        // guest bounced before the match (e.g. dev StrictMode remount,
        // failed scan) — the QR is still valid, go back to waiting
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
    R.peerGoneActive = false;
    R.role = null;
    R.offset = 0;
    R.bestRtt = undefined;
    R.clockDone = false;
    R.tally = { host: 0, guest: 0 };
    R.lastHostScore = 0;
    R.lastGuestScore = 0;
    R.roundN = 0;
    R.sim = createSim();
    if (R.renderer) R.sim.aspect = R.renderer.w / R.renderer.h;
    setScore({ me: 0, them: 0 });
    setKind(null);
    setPeerGone(null);
    setWinner(null);
    setSplash(null);
    setError(null);
    setRoomId(null);
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    setPhase("menu");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- connection ----------

  const connectRoom = useCallback(async (id, joining) => {
    const R = refs.current;
    ensureAudio();
    setError(null);
    const signal = new SignalClient();
    R.signal = signal;
    let role;
    try {
      role = await signal.connect(id);
    } catch {
      setError(joining ? "room full or expired" : "can't reach the signal server");
      setPhase("menu");
      return;
    }
    if (joining && role !== "guest") {
      // The host is gone; we'd be hosting a dead QR's room. Bail.
      signal.close();
      setError("that duel expired — host a new one");
      setPhase("menu");
      return;
    }
    R.role = role;
    R.debug.role = role;

    const transport = createTransport({ signal, role, forceRelay: FORCE_RELAY });
    R.transport = transport;
    transport.onSignal = (msg) => {
      if (msg.t === "peer-joined") {
        setPhase("connecting");
        // guest's "ready" will start negotiation
      } else if (msg.t === "peer-left") {
        onPeerLeft();
      } else if (msg.t === "ready") {
        // host: guest is set → create the offer
        transport.begin();
      }
    };
    transport.onEvent = onGameEvent;
    transport.onState = (buf) => {
      const p = decodeState(buf);
      if (p.type !== PKT_STATE) return;
      if (R.lastOppSeq >= 0 && !seqNewer(p.seq, R.lastOppSeq)) return;
      R.lastOppSeq = p.seq;
      setOpp(R.sim, p.x, p.vx, p.charge);
      R.debug.packetsIn += 1;
    };
    transport.onKind = (k) => {
      setKind(k);
      R.debug.kind = k;
    };
    signal.onClose = () => onPeerLeft();

    if (role === "guest") {
      setPhase("connecting");
      signal.send(ev.ready()); // raw signaling message (not relay-wrapped)
      transport.begin();
    } else {
      setPhase(joining ? "connecting" : "host");
    }

    const k = await transport.connected;
    R.debug.kind = k;
    // clock sync, then the host schedules the first countdown
    if (role === "guest") {
      for (let i = 0; i < 3; i++) {
        transport.sendEvent(ev.ping(Date.now()));
        await new Promise((res) => setTimeout(res, 130));
      }
      transport.sendEvent({ t: "clockdone" });
    } else {
      // fallback: if clockdone never arrives, start anyway
      const t = setTimeout(() => {
        if (!R.clockDone) {
          R.clockDone = true;
          sendCountdown();
        }
      }, 3000);
      R.hostTimers.push(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startHost = useCallback(() => {
    const id = genRoomId();
    setRoomId(id);
    connectRoom(id, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-join if the URL carries a room fragment. Cleanup tears the connection
  // down so StrictMode's dev double-mount reconnects cleanly instead of
  // occupying the room twice.
  useEffect(() => {
    if (desktop) return undefined;
    const id = hashRoomId();
    if (!id) return undefined;
    setPhase("connecting");
    connectRoom(id, true);
    return () => cleanup(refs.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- game loop ----------

  useEffect(() => {
    if (desktop) return;
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
    const frame = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      if (R.phase === "round") {
        const events = advance(R.sim, dt);
        for (const e of events) {
          if (e.type === "cross") sfx.tick();
          else if (e.type === "hit") {
            sfx.thud();
            shake(R.renderer);
            if (navigator.vibrate) navigator.vibrate(60);
            R.transport?.sendEvent(ev.hit(e.bullet.id));
            if (R.role === "host") hostTally("guest");
          }
        }
      }
      draw(R.renderer, R.sim);
      R.raf = requestAnimationFrame(frame);
    };
    R.raf = requestAnimationFrame(frame);

    // 30 Hz ship-state sender
    R.sendTimer = setInterval(() => {
      if (R.phase !== "round" || !R.transport || R.transport.kind === "connecting") return;
      R.transport.sendState(
        encodeState(R.seq++ & 0xffff, R.sim.me.x, R.sim.me.vx, R.sim.me.charging ? R.sim.me.charge : 0)
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
    e.currentTarget.setPointerCapture?.(e.pointerId);
    R.lastPointer = { x: e.clientX, t: performance.now() };
    startCharge(R.sim);
  }, []);

  const onPointerMove = useCallback((e) => {
    const R = refs.current;
    if (e.pointerId !== R.pointerId || !R.lastPointer) return;
    const now = performance.now();
    const dtMove = Math.max(1, now - R.lastPointer.t) / 1000;
    const w = R.renderer?.w || 1;
    const dx = ((e.clientX - R.lastPointer.x) / w) * 1.4;
    const vx = Math.max(-3, Math.min(3, dx / dtMove));
    moveShip(R.sim, dx, vx);
    R.lastPointer = { x: e.clientX, t: now };
  }, []);

  const onPointerUp = useCallback((e) => {
    const R = refs.current;
    if (e.pointerId !== R.pointerId) return;
    R.pointerId = null;
    R.lastPointer = null;
    const spawn = releaseCharge(R.sim);
    if (spawn) {
      sfx.fire(spawn.charge);
      R.transport?.sendEvent(
        ev.spawn(spawn.id, spawn.x, spawn.y, spawn.vx, spawn.vy, spawn.r, spawn.charge, hostNow())
      );
      R.debug.bulletsSpawned += 1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- render ----------

  if (desktop) {
    const url = location.href;
    return (
      <div className="seam-root">
        <div className="seam-center">
          <div className="seam-title">seam<span className="seam-slash"> /</span></div>
          <p className="seam-sub">
            this one needs two phones. open it on a phone and the second player
            scans a qr — one arena stitched across both screens.
          </p>
          <div className="seam-desktop-qr"><Qr text={url} /></div>
          <button className="seam-btn" onClick={() => navigate("/")}>back</button>
        </div>
      </div>
    );
  }

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

  return (
    <div className="seam-root">
      <canvas
        ref={canvasRef}
        className="seam-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {phase === "menu" && (
        <div className="seam-center">
          <div className="seam-title">seam<span className="seam-slash"> /</span></div>
          <p className="seam-sub">
            a duel across two phones. bullets fired off the top of your screen
            come down on theirs.
          </p>
          {error && <p className="seam-sub" style={{ color: "var(--accent)" }}>{error}</p>}
          <button className="seam-btn seam-btn--primary" onClick={startHost}>
            host a duel
          </button>
          <p className="seam-sub">the other phone joins by scanning — nothing to install</p>
          <button className="seam-btn" onClick={() => navigate("/")}>back</button>
        </div>
      )}

      {phase === "host" && roomId && (
        <div className="seam-center" data-room-url={roomUrl(roomId)}>
          <p className="seam-sub">scan with the other phone's camera</p>
          <div className="seam-qr"><Qr text={roomUrl(roomId)} /></div>
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

      {(phase === "countdown" || phase === "round" || phase === "score") && (
        <div className="seam-hud">
          {exitBtn}
          {kind && <span className="seam-badge">{kind}</span>}
          <Pips n={score.me} side="me" />
          <Pips n={score.them} side="them" />
          {phase === "countdown" && (
            <div className="seam-count">{count > 0 ? count : "go"}</div>
          )}
          {phase === "score" && splash && (
            <div className="seam-splash">
              <span>{splash.title}</span>
              <small>{splash.sub}</small>
            </div>
          )}
        </div>
      )}

      {phase === "end" && (
        <div className="seam-center">
          <div className="seam-title">
            {winner === "me" ? "you win" : "they win"}
          </div>
          <p className="seam-sub">{score.me} — {score.them}</p>
          <button
            className="seam-btn seam-btn--primary"
            onClick={() => {
              const R = refs.current;
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
            exit
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

      <div className="seam-rotate">rotate your phone — seam is portrait</div>
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
  clearInterval(R.countTimer);
  clearInterval(R.goneTimer);
  R.hostTimers?.forEach(clearTimeout);
  R.hostTimers = [];
  R.transport?.close();
  R.transport = null;
  R.signal?.close();
  R.signal = null;
  R.wakeLock?.release?.().catch?.(() => {});
  R.wakeLock = null;
  R.lastOppSeq = -1;
}
