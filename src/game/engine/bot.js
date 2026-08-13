// SEAM practice bot — "the machine". A headless second client living in the
// same page: it owns a full mirrored sim (it is the "me" of botSim), dodges
// what you throw at it, and fires real spawns back. Because it reuses the
// exact sim + spawn plumbing, the netplay and AI paths can't drift apart.
import {
  createSim, resetRound, advance, moveShip, startCharge, releaseCharge,
  setOpp, spawnRemote, X_MIN, X_MAX, Y_MIN, Y_MAX, SHIP_R,
} from "./sim.js";

export const DIFFICULTIES = {
  breezy: { label: "breezy", reactS: 0.7, aimErr: 0.13, dodgeP: 0.45, chargeP: 0.12, pushy: 0.15 },
  even: { label: "even", reactS: 0.42, aimErr: 0.07, dodgeP: 0.75, chargeP: 0.3, pushy: 0.35 },
  ruthless: { label: "ruthless", reactS: 0.24, aimErr: 0.03, dodgeP: 0.93, chargeP: 0.45, pushy: 0.6 },
};

const toMsg = (b) => ({
  id: b.id, x: b.x, y: b.y, vx: b.vx, vy: b.vy,
  ax: b.ax || 0, r: b.r, charge: b.charge,
  mb: b.maxBounce ?? 1, sp: b.split || 0, dmg: b.dmg ?? 1,
});

export function createBot(difficulty = "even", fighterId = "orb") {
  const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.even;
  const bot = {
    sim: createSim(fighterId),
    fighterId,
    diff,
    nextThink: 0,
    releaseAt: 0,
    targetX: 0.5,
    targetY: Y_MIN + 0.08,
    wanderSeed: Math.random() * 1000,
  };
  return bot;
}

export function resetBot(bot) {
  resetRound(bot.sim);
  bot.nextThink = 0;
  bot.releaseAt = 0;
}

// Feed the player's state into the bot's world (bot sees the player as "opp").
// x/vx/y are in the PLAYER's local frame — same shape as a state packet.
export function botSeePlayer(bot, x, vx, charge, y) {
  setOpp(bot.sim, x, vx, charge, y);
}

// The player fired: msg is the spawn in the player's frame (shooter frame);
// spawnRemote mirrors it into the bot's local frame.
export function botReceiveSpawn(bot, msg) {
  spawnRemote(bot.sim, msg, 0);
}

// One frame: advance the bot's world, think, maybe fire.
// Returns { events, spawns } — events from the bot's sim ("hit" = bot died),
// spawns as shooter-frame messages ready for spawnRemote() into MY sim.
export function botUpdate(bot, dt) {
  const s = bot.sim;
  const d = bot.diff;
  const events = advance(s, dt);
  const spawns = [];

  // --- think at human-ish cadence ---
  bot.nextThink -= dt;
  if (bot.nextThink <= 0) {
    bot.nextThink = d.reactS * (0.7 + Math.random() * 0.6);

    // 1. threat scan: nearest incoming bullet on a collision course
    let threat = null;
    let threatT = Infinity;
    for (const b of s.bullets) {
      if (b.dead || b.mine || b.vy >= 0) continue;
      const t = (b.y - s.me.y) / -b.vy; // seconds until it reaches my lane
      if (t < 0 || t > 1.4) continue;
      const bx = b.x + b.vx * t + 0.5 * (b.ax || 0) * t * t;
      if (Math.abs(bx - s.me.x) < (b.r + SHIP_R) * 3 && t < threatT) {
        threat = { bx, t, b };
        threatT = t;
      }
    }

    if (threat && Math.random() < d.dodgeP) {
      // dodge perpendicular: pick the side with more room
      const side = threat.bx > s.me.x ? -1 : 1;
      const roomAware =
        (side < 0 && s.me.x < X_MIN + 0.12) || (side > 0 && s.me.x > X_MAX - 0.12)
          ? -side
          : side;
      bot.targetX = s.me.x + roomAware * (0.16 + Math.random() * 0.12);
      // urgent threats also push the bot back toward its baseline
      if (threat.t < 0.45) bot.targetY = Math.max(Y_MIN, s.me.y - 0.12);
    } else {
      // 2. stalk: mirror the player's x with aim error, wander a little
      const wander = Math.sin(s.time * 0.7 + bot.wanderSeed) * 0.06;
      bot.targetX = s.opp.x + (Math.random() * 2 - 1) * d.aimErr + wander;
      // pushy bots creep toward the seam so their shots land sooner
      const push = d.pushy * (0.5 + 0.5 * Math.sin(s.time * 0.23 + bot.wanderSeed));
      bot.targetY = Y_MIN + 0.05 + push * (Y_MAX - Y_MIN - 0.1);
    }
    bot.targetX = Math.min(X_MAX, Math.max(X_MIN, bot.targetX));

    // 3. trigger discipline: fire when roughly lined up and ammo allows
    if (!s.me.charging && s.time >= s.me.cooldownUntil && s.me.ammo >= 1) {
      const aligned = Math.abs(s.opp.x - s.me.x) < 0.14 + d.aimErr * 2;
      if (aligned && Math.random() < 0.85) {
        if (startCharge(s)) {
          const wantCharge = Math.random() < d.chargeP;
          bot.releaseAt = s.time + (wantCharge ? 0.55 + Math.random() * 0.5 : 0.05);
        }
      }
    }
  }

  // --- act every frame ---
  // glide toward target (proportional controller, feels less robotic)
  const dx = bot.targetX - s.me.x;
  const dy = bot.targetY - s.me.y;
  const gain = 2.6;
  moveShip(
    s,
    Math.max(-0.9, Math.min(0.9, dx * gain)) * dt,
    Math.max(-0.7, Math.min(0.7, dy * gain)) * dt,
    dx * gain,
    dy * gain
  );

  if (s.me.charging && s.time >= bot.releaseAt) {
    for (const b of releaseCharge(s)) spawns.push(toMsg(b));
  }

  return { events, spawns };
}

export function pickBotFighter(playerFighter) {
  // the machine counters: something different from what you picked
  const pool = ["dart", "swarm", "orb"].filter((f) => f !== playerFighter);
  return pool[Math.floor(Math.random() * pool.length)];
}
