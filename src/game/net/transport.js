// Transport — one interface, two implementations under a facade:
//   p2p:   WebRTC, "state" channel {ordered:false, maxRetransmits:0} + reliable "events"
//   relay: the already-open signaling WebSocket (binary passthrough + {t:"relay"} JSON)
// The game can't tell which is active; `kind` is exposed for the HUD badge.
// Host creates the offer once the guest's "ready" arrives (fixed roles, so
// perfect-negotiation-lite: exactly one offerer, no glare possible).

import { slog } from "./log.js";

const DEFAULT_ICE = [
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:stun.l.google.com:19302" },
];

// Unreachable TURN-only config (TEST-NET-1 address) — exercises the relay
// fallback path deterministically. Dev-only, picked via ?forcerelay=1.
const UNREACHABLE_ICE = [
  { urls: "turn:192.0.2.1:3478?transport=udp", username: "seam", credential: "seam" },
];

// Tightened 2026-08-14: a 7-10s dead "connecting" screen reads as a failed
// scan and players re-scan before the relay fallback ever fires. Cross-network
// ICE either succeeds within ~3s or won't; fail over to relay fast.
const FALLBACK_AFTER_GATHER_MS = 3500; // not connected 3.5s after ICE gathering completes
const FALLBACK_HARD_CAP_MS = 6000; // in case gathering never completes

export function createTransport({ signal, role, forceRelay = false }) {
  const t = {
    kind: "connecting", // "connecting" → "p2p" | "relay"
    onState: null, // (ArrayBuffer) => void
    onEvent: null, // (obj) => void
    onKind: null, // (kind) => void
    onSignal: null, // non-transport signal messages (peer-joined/peer-left/ready) → UI
    sendState(buf) {
      if (t.kind === "p2p" && stateCh?.readyState === "open") stateCh.send(buf);
      else if (t.kind === "relay") signal.sendBinary(buf);
    },
    sendEvent(obj) {
      if (t.kind === "p2p" && eventsCh?.readyState === "open") eventsCh.send(JSON.stringify(obj));
      else signal.send({ t: "relay", d: obj }); // relay + still-connecting both go via signal
    },
    begin, // call when the ready handshake is done (both sides)
    close,
  };

  let pc = null;
  let stateCh = null;
  let eventsCh = null;
  let settled = false;
  let timers = [];
  let pendingIce = [];

  let resolveConnected;
  t.connected = new Promise((res) => (resolveConnected = res));

  // The transport owns the signal message stream and forwards what isn't its.
  signal.onJson = (msg) => {
    switch (msg.t) {
      case "offer":
        handleOffer(msg);
        break;
      case "answer":
        handleAnswer(msg);
        break;
      case "ice":
        handleIce(msg);
        break;
      case "use-relay":
        settle("relay");
        break;
      case "relay":
        t.onEvent?.(msg.d);
        break;
      default:
        t.onSignal?.(msg);
    }
  };
  signal.onBinary = (buf) => t.onState?.(buf);

  function settle(kind) {
    if (settled) return;
    settled = true;
    slog("transport:settle", { role, kind });
    timers.forEach(clearTimeout);
    timers = [];
    t.kind = kind;
    if (kind === "relay") {
      if (pc) {
        try {
          pc.close();
        } catch { /* noop */ }
        pc = null;
      }
      // Make sure the peer lands on relay too (idempotent on their side).
      signal.send({ t: "use-relay" });
    }
    t.onKind?.(kind);
    resolveConnected(kind);
  }

  function channelsOpen() {
    if (stateCh?.readyState === "open" && eventsCh?.readyState === "open") {
      settle("p2p");
    }
  }

  function wireChannel(ch) {
    ch.binaryType = "arraybuffer";
    ch.onopen = channelsOpen;
    ch.onmessage = (e) => {
      if (typeof e.data === "string") t.onEvent?.(JSON.parse(e.data));
      else t.onState?.(e.data);
    };
    if (ch.label === "state") stateCh = ch;
    else eventsCh = ch;
  }

  function makePc() {
    pc = new RTCPeerConnection({
      iceServers: forceRelay ? UNREACHABLE_ICE : DEFAULT_ICE,
      ...(forceRelay ? { iceTransportPolicy: "relay" } : {}),
    });
    pc.onicecandidate = (e) => {
      if (e.candidate) signal.send({ t: "ice", c: e.candidate.toJSON() });
    };
    pc.onicegatheringstatechange = () => {
      if (pc?.iceGatheringState === "complete" && !settled) {
        timers.push(
          setTimeout(() => {
            if (pc?.connectionState !== "connected") settle("relay");
          }, FALLBACK_AFTER_GATHER_MS)
        );
      }
    };
    pc.onconnectionstatechange = () => {
      slog("transport:pcstate", { role, state: pc?.connectionState });
      if (!settled && (pc?.connectionState === "failed" || pc?.connectionState === "closed")) {
        settle("relay");
      }
    };
    pc.ondatachannel = (e) => wireChannel(e.channel); // guest side
    return pc;
  }

  let begun = false;
  async function begin() {
    // A repeated begin() (host: a fresh guest re-sent "ready") is logged so a
    // stuck handshake is visible; the transport itself is single-shot — the
    // GAME must build a new one per guest attempt (Seam.jsx does, since
    // 2026-08-14; a spent transport swallowing the second guest's ready was
    // why pairing only worked on the second scan).
    if (begun || settled) {
      slog("transport:begin-ignored", { role, begun, settled, kind: t.kind });
      return;
    }
    begun = true;
    slog("transport:begin", { role });
    timers.push(
      setTimeout(() => {
        if (!settled) settle("relay");
      }, FALLBACK_HARD_CAP_MS)
    );
    try {
      makePc();
      if (role === "host") {
        wireChannel(pc.createDataChannel("state", { ordered: false, maxRetransmits: 0 }));
        wireChannel(pc.createDataChannel("events")); // ordered + reliable (defaults)
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        signal.send({ t: "offer", sdp: pc.localDescription });
      }
      // guest waits for the offer
    } catch {
      settle("relay");
    }
  }

  async function handleOffer(msg) {
    if (role !== "guest" || settled) return;
    try {
      if (!pc) makePc();
      await pc.setRemoteDescription(msg.sdp);
      await drainIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      signal.send({ t: "answer", sdp: pc.localDescription });
    } catch {
      settle("relay");
    }
  }

  async function handleAnswer(msg) {
    if (role !== "host" || settled || !pc) return;
    try {
      await pc.setRemoteDescription(msg.sdp);
      await drainIce();
    } catch {
      settle("relay");
    }
  }

  async function handleIce(msg) {
    if (!pc || settled) {
      pendingIce.push(msg.c);
      return;
    }
    if (!pc.remoteDescription) {
      pendingIce.push(msg.c);
      return;
    }
    try {
      await pc.addIceCandidate(msg.c);
    } catch { /* stale candidate, fine */ }
  }

  async function drainIce() {
    const queued = pendingIce;
    pendingIce = [];
    for (const c of queued) {
      try {
        await pc.addIceCandidate(c);
      } catch { /* stale candidate, fine */ }
    }
  }

  function close() {
    settled = true;
    timers.forEach(clearTimeout);
    timers = [];
    if (pc) {
      try {
        pc.close();
      } catch { /* noop */ }
      pc = null;
    }
  }

  return t;
}
