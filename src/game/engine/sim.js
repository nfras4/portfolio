// SEAM simulation — pure logic, no DOM.
// Local frame: x ∈ [0,1] across the arena width; y ∈ [0,2] where MY half is
// [0,1] (baseline at y≈0, seam at y=1) and the opponent's half is (1,2].
// Each phone renders only y ∈ [0,1]. A bullet spawn is broadcast in the
// shooter's local frame; the receiver mirrors it: x'=1−x, y'=2−y, v'=−v.
// Authority: I simulate ALL bullets locally, but only detect hits on MY ship
// (I own my own death and announce it; the shooter owns the spawn).
//
// DETERMINISM: every bullet's flight is fully determined by its spawn params
// (position, velocity, lateral accel, bounce budget, split flag) — both sims
// integrate the same trajectory. No live homing, ever.
import { getFighter, splitChildren } from "./fighters.js";

export const TICK = 1 / 120;
export const SHIP_R = 0.032; // ship hit radius, x-units
export const HP_MAX = 3; // hits to lose a round — charge shots deal 2
// 2D movement bounds: the ship roams its own half, not just a lane
export const X_MIN = 0.05;
export const X_MAX = 0.95;
export const Y_MIN = 0.06;
export const Y_MAX = 0.6;
export const SHIP_START_Y = 0.12;
export const COOLDOWN_S = 0.26;
export const CHARGE_S = 0.9; // hold time for full charge (after the 150ms tap window)
const BULLET_VX_INHERIT = 0.35; // bullet inherits ship vx × this
const BULLET_VX_MAX = 0.4;

export function createSim(fighterId = "dart") {
  const f = getFighter(fighterId);
  return {
    time: 0,
    acc: 0,
    aspect: 0.5, // canvas w/h, set by renderer; used for isotropic hit math
    fighter: f.id,
    me: {
      x: 0.5, y: SHIP_START_Y, vx: 0, vy: 0,
      ammo: f.ammoMax,
      hp: HP_MAX,
      charge: 0, charging: false, chargeStart: 0, cooldownUntil: 0,
      dryUntil: 0, // dry-fire flash timer for the renderer
      hurtUntil: 0, // took-damage blink timer
      alive: true,
    },
    opp: { x: 0.5, vx: 0, depth: SHIP_START_Y, charge: 0, hp: HP_MAX, fighter: null, seen: false },
    bullets: [], // {id,x,y,vx,vy,ax,r,charge,mine,bounces,maxBounce,split,crossed,dead,trail:[]}
    nextBulletId: 1,
  };
}

export function setFighter(sim, fighterId) {
  const f = getFighter(fighterId);
  sim.fighter = f.id;
  sim.me.ammo = f.ammoMax;
}

export function resetRound(sim) {
  const f = getFighter(sim.fighter);
  sim.me.x = 0.5;
  sim.me.y = SHIP_START_Y;
  sim.me.vx = 0;
  sim.me.vy = 0;
  sim.me.ammo = f.ammoMax;
  sim.me.hp = HP_MAX;
  sim.me.charge = 0;
  sim.me.charging = false;
  sim.me.cooldownUntil = 0;
  sim.me.hurtUntil = 0;
  sim.me.alive = true;
  sim.opp.x = 0.5;
  sim.opp.vx = 0;
  sim.opp.depth = SHIP_START_Y;
  sim.opp.hp = HP_MAX;
  sim.bullets = [];
}

// --- input ---

export function moveShip(sim, dx, dy, vx, vy) {
  const speed = getFighter(sim.fighter).shipSpeed;
  sim.me.x = Math.min(X_MAX, Math.max(X_MIN, sim.me.x + dx * speed));
  sim.me.y = Math.min(Y_MAX, Math.max(Y_MIN, sim.me.y + (dy || 0) * speed));
  sim.me.vx = vx * speed;
  sim.me.vy = (vy || 0) * speed;
}

// Largest charge level the current ammo can pay for (honest charge ring).
export function chargeCap(sim) {
  const f = getFighter(sim.fighter);
  for (const c of [1, 0.45, 0]) {
    if (f.cost(c) <= sim.me.ammo + 1e-6) return c === 0 ? 0.049 : c;
  }
  return 0;
}

export function startCharge(sim) {
  if (!sim.me.alive || sim.time < sim.me.cooldownUntil) return false;
  if (sim.me.ammo < 1) {
    sim.me.dryUntil = sim.time + 0.25;
    return false;
  }
  sim.me.charging = true;
  sim.me.chargeStart = sim.time;
  sim.me.charge = 0;
  return true;
}

// Release the pointer: quick shot if held <150ms, else charged shot.
// Returns an array of spawned bullets to broadcast (empty → nothing fired).
export function releaseCharge(sim) {
  if (!sim.me.charging) return [];
  sim.me.charging = false;
  const held = sim.time - sim.me.chargeStart;
  let charge = held < 0.15 ? 0 : Math.min(1, (held - 0.15) / CHARGE_S);
  charge = Math.min(charge, chargeCap(sim));
  sim.me.charge = 0;
  return fire(sim, charge);
}

function fire(sim, charge) {
  if (!sim.me.alive || sim.time < sim.me.cooldownUntil) return [];
  const f = getFighter(sim.fighter);
  const cost = f.cost(charge);
  if (sim.me.ammo < cost) {
    sim.me.dryUntil = sim.time + 0.25;
    return [];
  }
  sim.me.ammo -= cost;
  sim.me.cooldownUntil = sim.time + COOLDOWN_S;
  const inherit = Math.max(
    -BULLET_VX_MAX,
    Math.min(BULLET_VX_MAX, sim.me.vx * BULLET_VX_INHERIT)
  );
  const out = [];
  for (const spec of f.fire(sim.me, charge)) {
    const b = {
      id: sim.nextBulletId++,
      x: Math.min(X_MAX, Math.max(X_MIN, sim.me.x + (spec.dx || 0))),
      y: sim.me.y + 0.035,
      vx: (spec.vx || 0) + inherit,
      vy: spec.vy,
      ax: spec.ax || 0,
      r: spec.r,
      charge,
      mine: true,
      bounces: 0,
      maxBounce: spec.maxBounce ?? 1,
      split: spec.split || 0,
      dmg: spec.dmg ?? 1,
      crossed: false,
      dead: false,
      trail: [],
    };
    sim.bullets.push(b);
    out.push(b);
  }
  return out;
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
    ax: -(msg.ax || 0),
    r: msg.r,
    charge: msg.charge,
    mine: false,
    bounces: 0,
    maxBounce: msg.mb ?? 1,
    split: msg.sp || 0,
    dmg: msg.dmg ?? 1,
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

export function setOpp(sim, x, vx, charge, y, fighterId, hp) {
  sim.opp.x = Math.min(X_MAX, Math.max(X_MIN, 1 - x)); // mirror into my frame
  sim.opp.vx = -vx;
  sim.opp.charge = charge;
  if (y !== undefined) sim.opp.depth = y; // THEIR local y — depth cue only
  if (fighterId) sim.opp.fighter = fighterId;
  if (hp !== undefined) sim.opp.hp = hp;
  sim.opp.seen = true;
}

function reflectWalls(b) {
  if (b.x < b.r) {
    b.x = b.r + (b.r - b.x);
    b.vx = -b.vx;
    b.ax = -b.ax;
    b.bounces++;
  } else if (b.x > 1 - b.r) {
    b.x = 1 - b.r - (b.x - (1 - b.r));
    b.vx = -b.vx;
    b.ax = -b.ax;
    b.bounces++;
  }
}

// --- stepping ---
// advance() accumulates real elapsed time and runs fixed 120 Hz steps.
// Returns emitted events: {type:"cross"|"hit"|"bounce"|"split", bullet}.

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
  const f = getFighter(sim.fighter);

  // ammo trickles back, capped
  sim.me.ammo = Math.min(f.ammoMax, sim.me.ammo + f.regen * dt);

  if (sim.me.charging) {
    const held = sim.time - sim.me.chargeStart;
    const raw = held < 0.15 ? 0 : Math.min(1, (held - 0.15) / CHARGE_S);
    sim.me.charge = Math.min(raw, chargeCap(sim));
  }

  // finger holding still shouldn't keep reporting stale velocity
  sim.me.vx *= 0.93;
  sim.me.vy *= 0.93;
  if (Math.abs(sim.me.vx) < 0.001) sim.me.vx = 0;
  if (Math.abs(sim.me.vy) < 0.001) sim.me.vy = 0;

  // opponent ghost extrapolation between packets
  sim.opp.x = Math.min(X_MAX, Math.max(X_MIN, sim.opp.x + sim.opp.vx * dt));

  const hw = 1 / sim.aspect; // vertical scale to make distances isotropic in x-units
  const spawnQueue = [];

  for (const b of sim.bullets) {
    if (b.dead) continue;
    b.trail.push(b.x, b.y);
    if (b.trail.length > 12) b.trail.splice(0, b.trail.length - 12);

    b.vx += (b.ax || 0) * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // side walls: bounce budget per bullet type, next contact kills
    if (b.x < b.r || b.x > 1 - b.r) {
      if (b.bounces >= b.maxBounce) {
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
      // seam-breaker: the orb detonates into three at the seam, on BOTH sims
      // (children derive from parent params alone — stays deterministic)
      if (b.split) {
        b.dead = true;
        for (const c of splitChildren(b)) {
          spawnQueue.push({
            id: sim.nextBulletId++ * (b.mine ? 1 : -1),
            x: c.x, y: c.y, vx: c.vx, vy: c.vy, ax: c.ax,
            r: c.r, charge: c.charge,
            mine: b.mine,
            bounces: 0, maxBounce: c.maxBounce, split: 0,
            crossed: true, dead: false, trail: [],
          });
        }
        out.push({ type: "split", bullet: b });
        continue;
      }
    }

    // die at baselines
    if (b.y < -0.05 || b.y > 2.05) {
      b.dead = true;
      continue;
    }

    // hits: incoming bullets vs MY ship only (I am authoritative for my death).
    // HP model: shots chip health; death only at 0 — charge shots deal 2.
    if (!b.mine && sim.me.alive) {
      const dx = b.x - sim.me.x;
      const dy = (b.y - sim.me.y) * hw;
      const rr = b.r + SHIP_R;
      if (dx * dx + dy * dy < rr * rr) {
        b.dead = true;
        sim.me.hp = Math.max(0, sim.me.hp - (b.dmg ?? 1));
        sim.me.hurtUntil = sim.time + 0.55;
        if (sim.me.hp <= 0) {
          sim.me.alive = false;
          out.push({ type: "hit", bullet: b });
        } else {
          out.push({ type: "hurt", bullet: b });
        }
      }
    }
  }

  if (spawnQueue.length) sim.bullets.push(...spawnQueue);
  if (sim.bullets.length > 96) sim.bullets = sim.bullets.filter((b) => !b.dead);
}
