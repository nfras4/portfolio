// SEAM wire protocol.
// State packet (unreliable channel, 30 Hz): binary, 24 bytes.
//   type u8 | seq u16 | x f32 | y f32 | vx f32 | vy f32 | charge f32 | hp u8
// Events (reliable channel): JSON objects { t: "...", ... }.

export const PKT_STATE = 1;
export const STATE_BYTES = 24;

export function encodeState(seq, x, y, vx, vy, charge, hp) {
  const buf = new ArrayBuffer(STATE_BYTES);
  const dv = new DataView(buf);
  dv.setUint8(0, PKT_STATE);
  dv.setUint16(1, seq & 0xffff);
  dv.setFloat32(3, x);
  dv.setFloat32(7, y);
  dv.setFloat32(11, vx);
  dv.setFloat32(15, vy);
  dv.setFloat32(19, charge);
  dv.setUint8(23, hp & 0xff);
  return buf;
}

export function decodeState(buf) {
  const dv = new DataView(buf);
  return {
    type: dv.getUint8(0),
    seq: dv.getUint16(1),
    x: dv.getFloat32(3),
    y: dv.getFloat32(7),
    vx: dv.getFloat32(11),
    vy: dv.getFloat32(15),
    charge: dv.getFloat32(19),
    hp: dv.getUint8(23),
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
  // ax: lateral accel, mb: bounce budget, sp: splits at the seam.
  spawn: (b, at) => ({
    t: "spawn",
    id: b.id, x: b.x, y: b.y, vx: b.vx, vy: b.vy,
    ax: b.ax || 0, r: b.r, charge: b.charge,
    mb: b.maxBounce ?? 1, sp: b.split || 0, dmg: b.dmg ?? 1,
    at,
  }),
  hit: (bulletId) => ({ t: "hit", bulletId }),
  hurt: (hp) => ({ t: "hurt", hp }),
  fighter: (fid) => ({ t: "fighter", fid }),
  countdown: (round, startAt) => ({ t: "countdown", round, startAt }),
  score: (host, guest, startNext) => ({ t: "score", host, guest, startNext }),
  end: (winner) => ({ t: "end", winner }),
  rematch: () => ({ t: "rematch" }),
  ping: (ts) => ({ t: "ping", ts }),
  pong: (ts, now) => ({ t: "pong", ts, now }),
};
