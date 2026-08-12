// SEAM wire protocol.
// State packet (unreliable channel, 30 Hz): binary, 15 bytes.
//   type u8 | seq u16 | x f32 | vx f32 | charge f32
// Events (reliable channel): JSON objects { t: "...", ... }.

export const PKT_STATE = 1;
export const STATE_BYTES = 15;

export function encodeState(seq, x, vx, charge) {
  const buf = new ArrayBuffer(STATE_BYTES);
  const dv = new DataView(buf);
  dv.setUint8(0, PKT_STATE);
  dv.setUint16(1, seq & 0xffff);
  dv.setFloat32(3, x);
  dv.setFloat32(7, vx);
  dv.setFloat32(11, charge);
  return buf;
}

export function decodeState(buf) {
  const dv = new DataView(buf);
  return {
    type: dv.getUint8(0),
    seq: dv.getUint16(1),
    x: dv.getFloat32(3),
    vx: dv.getFloat32(7),
    charge: dv.getFloat32(11),
  };
}

// seq wraps at 2^16; true if a is newer than b in wrap-around order.
export function seqNewer(a, b) {
  return ((a - b) & 0xffff) !== 0 && ((a - b) & 0xffff) < 0x8000;
}

// Event helpers — every event is a plain JSON object with a `t` tag.
export const ev = {
  ready: () => ({ t: "ready" }),
  // Bullet spawn, in the SHOOTER's local frame (x∈[0,1], y∈[0,2], seam at y=1).
  spawn: (id, x, y, vx, vy, r, charge, at) => ({ t: "spawn", id, x, y, vx, vy, r, charge, at }),
  hit: (bulletId) => ({ t: "hit", bulletId }),
  countdown: (round, startAt) => ({ t: "countdown", round, startAt }),
  score: (host, guest, startNext) => ({ t: "score", host, guest, startNext }),
  end: (winner) => ({ t: "end", winner }),
  rematch: () => ({ t: "rematch" }),
  ping: (ts) => ({ t: "ping", ts }),
  pong: (ts, now) => ({ t: "pong", ts, now }),
};
