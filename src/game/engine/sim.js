// SEAM simulation — pure logic, no DOM.
// Local frame: x ∈ [0,1] across the arena width; y ∈ [0,2] where MY half is
// [0,1] (baseline at y≈0, seam at y=1) and the opponent's half is (1,2].
// Each phone renders only y ∈ [0,1]. A bullet spawn is broadcast in the
// shooter's local frame; the receiver mirrors it: x'=1−x, y'=2−y, v'=−v.
// Authority: I simulate ALL bullets locally, but only detect hits on MY ship
// (I own my own death and announce it; the shooter owns the spawn).

export const TICK = 1 / 120;
export const SHIP_Y = 0.07; // ship lane height above baseline
export const SHIP_R = 0.032; // ship hit radius, x-units
const BULLET_R = 0.011; // base bullet radius, x-units
// Plan says base speed 0.55 units/s where a "unit" is the full two-half arena;
// local y spans 2 per arena, so ×2 here. Uncharged seam-to-baseline ≈ 1.8 s.
const BASE_VY = 0.55 * 2;
const CHARGE_SPEED_K = 0.9; // speed ×(1+0.9c)
const CHARGE_RADIUS_K = 0.8; // radius ×(1+0.8c)
export const COOLDOWN_S = 0.28;
export const CHARGE_S = 0.9; // hold time for full charge (after the 150ms tap window)
const BULLET_VX_INHERIT = 0.35; // bullet inherits ship vx × this
const BULLET_VX_MAX = 0.4;
const X_MIN = 0.05;
const X_MAX = 0.95;

export function createSim() {
  return {
    time: 0,
    acc: 0,
    aspect: 0.5, // canvas w/h, set by renderer; used for isotropic hit math
    me: { x: 0.5, vx: 0, charge: 0, charging: false, chargeStart: 0, cooldownUntil: 0, alive: true },
    opp: { x: 0.5, vx: 0, charge: 0, seen: false },
    bullets: [], // {id, x, y, vx, vy, r, charge, mine, bounces, crossed, dead, trail:[]}
    nextBulletId: 1,
  };
}

export function resetRound(sim) {
  sim.me.x = 0.5;
  sim.me.vx = 0;
  sim.me.charge = 0;
  sim.me.charging = false;
  sim.me.cooldownUntil = 0;
  sim.me.alive = true;
  sim.opp.x = 0.5;
  sim.opp.vx = 0;
  sim.bullets = [];
}

// --- input ---

export function moveShip(sim, dx, vx) {
  sim.me.x = Math.min(X_MAX, Math.max(X_MIN, sim.me.x + dx));
  sim.me.vx = vx;
}

export function startCharge(sim) {
  if (!sim.me.alive || sim.time < sim.me.cooldownUntil) return false;
  sim.me.charging = true;
  sim.me.chargeStart = sim.time;
  sim.me.charge = 0;
  return true;
}

// Release the pointer: quick shot if held <150ms, else charged shot.
// Returns the spawn event to broadcast, or null.
export function releaseCharge(sim) {
  if (!sim.me.charging) return null;
  sim.me.charging = false;
  const held = sim.time - sim.me.chargeStart;
  const charge = held < 0.15 ? 0 : Math.min(1, (held - 0.15) / CHARGE_S);
  sim.me.charge = 0;
  return fire(sim, charge);
}

function fire(sim, charge) {
  if (!sim.me.alive || sim.time < sim.me.cooldownUntil) return null;
  sim.me.cooldownUntil = sim.time + COOLDOWN_S;
  const vx = Math.max(
    -BULLET_VX_MAX,
    Math.min(BULLET_VX_MAX, sim.me.vx * BULLET_VX_INHERIT)
  );
  const b = {
    id: sim.nextBulletId++,
    x: sim.me.x,
    y: SHIP_Y + 0.03,
    vx,
    vy: BASE_VY * (1 + CHARGE_SPEED_K * charge),
    r: BULLET_R * (1 + CHARGE_RADIUS_K * charge),
    charge,
    mine: true,
    bounces: 0,
    crossed: false,
    dead: false,
    trail: [],
  };
  sim.bullets.push(b);
  return b;
}

// Remote spawn (already in the SHOOTER's frame) → mirror into mine, then
// forward-extrapolate by estimated one-way latency so trajectories line up.
export function spawnRemote(sim, msg, latencySec) {
  const b = {
    id: -msg.id, // negative namespace so ids never collide with mine
    x: 1 - msg.x,
    y: 2 - msg.y,
    vx: -msg.vx,
    vy: -msg.vy,
    r: msg.r,
    charge: msg.charge,
    mine: false,
    bounces: 0,
    crossed: false,
    dead: false,
    trail: [],
  };
  const lat = Math.min(0.35, Math.max(0, latencySec || 0));
  b.x += b.vx * lat;
  b.y += b.vy * lat;
  reflectWalls(b);
  sim.bullets.push(b);
  return b;
}

export function setOpp(sim, x, vx, charge) {
  sim.opp.x = Math.min(X_MAX, Math.max(X_MIN, 1 - x)); // mirror into my frame
  sim.opp.vx = -vx;
  sim.opp.charge = charge;
  sim.opp.seen = true;
}

function reflectWalls(b) {
  if (b.x < b.r) {
    b.x = b.r + (b.r - b.x);
    b.vx = -b.vx;
    b.bounces++;
  } else if (b.x > 1 - b.r) {
    b.x = 1 - b.r - (b.x - (1 - b.r));
    b.vx = -b.vx;
    b.bounces++;
  }
}

// --- stepping ---
// advance() accumulates real elapsed time and runs fixed 120 Hz steps.
// Returns emitted events: {type:"cross"|"hit"|"bounce", bullet}.

export function advance(sim, elapsed) {
  const out = [];
  sim.acc += Math.min(elapsed, 0.25); // clamp huge tab-switch gaps
  while (sim.acc >= TICK) {
    sim.acc -= TICK;
    step(sim, TICK, out);
  }
  return out;
}

function step(sim, dt, out) {
  sim.time += dt;

  if (sim.me.charging) {
    const held = sim.time - sim.me.chargeStart;
    sim.me.charge = held < 0.15 ? 0 : Math.min(1, (held - 0.15) / CHARGE_S);
  }

  // finger holding still shouldn't keep reporting stale velocity
  sim.me.vx *= 0.93;
  if (Math.abs(sim.me.vx) < 0.001) sim.me.vx = 0;

  // opponent ghost extrapolation between packets
  sim.opp.x = Math.min(X_MAX, Math.max(X_MIN, sim.opp.x + sim.opp.vx * dt));

  const hw = 1 / sim.aspect; // vertical scale to make distances isotropic in x-units

  for (const b of sim.bullets) {
    if (b.dead) continue;
    b.trail.push(b.x, b.y);
    if (b.trail.length > 12) b.trail.splice(0, b.trail.length - 12);

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // side walls: one bounce, second contact kills
    if (b.x < b.r || b.x > 1 - b.r) {
      if (b.bounces >= 1) {
        b.dead = true;
        continue;
      }
      reflectWalls(b);
      if (b.y <= 1.02) out.push({ type: "bounce", bullet: b });
    }

    // seam crossing (either direction) — tick when it enters/leaves my screen
    if (!b.crossed && ((b.mine && b.y >= 1) || (!b.mine && b.y <= 1))) {
      b.crossed = true;
      out.push({ type: "cross", bullet: b });
    }

    // die at baselines
    if (b.y < -0.05 || b.y > 2.05) {
      b.dead = true;
      continue;
    }

    // hits: incoming bullets vs MY ship only (I am authoritative for my death)
    if (!b.mine && sim.me.alive) {
      const dx = b.x - sim.me.x;
      const dy = (b.y - SHIP_Y) * hw;
      const rr = b.r + SHIP_R;
      if (dx * dx + dy * dy < rr * rr) {
        b.dead = true;
        sim.me.alive = false;
        out.push({ type: "hit", bullet: b });
      }
    }
  }

  if (sim.bullets.length > 64) sim.bullets = sim.bullets.filter((b) => !b.dead);
}
