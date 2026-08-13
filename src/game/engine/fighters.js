// SEAM fighter roster — each fighter is a behavior script over the shared
// loop (move, charge, shoot, dodge), mirroring how DUAL! varies its ships
// (see docs/overnight/dual-game-research.md §9): one generic interface, the
// projectile behavior is the personality.
//
// DETERMINISM RULE: both phones simulate every bullet independently, so a
// bullet's whole flight must be computable from its spawn parameters alone.
// No live homing — "seek" is a fixed lateral acceleration baked in at fire
// time from where the opponent WAS (dodgeable, and identical on both sims).

const BASE_VY = 0.55 * 2; // matches sim.js: units are the two-half arena
const BULLET_R = 0.011;

export const FIGHTERS = {
  dart: {
    id: "dart",
    name: "dart",
    tag: "balanced",
    shotDesc: "single straight bolt",
    chargeDesc: "heavy slug — bigger, faster",
    shipSpeed: 1.0,
    ammoMax: 3,
    regen: 0.8, // units per second
    // cost: quick tap 1, full charge 2
    cost: (c) => (c > 0.05 ? 2 : 1),
    fire(me, charge) {
      return [
        {
          dx: 0,
          vx: 0,
          vy: BASE_VY * (1 + 0.9 * charge),
          r: BULLET_R * (1 + 0.8 * charge),
          ax: 0,
          maxBounce: 1,
          split: 0,
          dmg: charge > 0.5 ? 2 : 1, // the slug earns its charge time
        },
      ];
    },
  },

  swarm: {
    id: "swarm",
    name: "swarm",
    tag: "fast + loose",
    shotDesc: "fan of three quick darts",
    chargeDesc: "five-wide fan, curved inward",
    shipSpeed: 1.18,
    ammoMax: 4,
    regen: 1.1,
    cost: (c) => (c > 0.05 ? 2 : 1),
    fire(me, charge) {
      const n = charge > 0.35 ? 5 : 3;
      const out = [];
      const spread = 0.26;
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : i / (n - 1) - 0.5; // -0.5..0.5
        out.push({
          dx: t * 0.02,
          vx: t * 2 * spread,
          // outer darts curve gently back toward center so the fan converges
          // near the far baseline instead of hitting the walls
          ax: -t * 2 * 0.18,
          vy: BASE_VY * 1.18,
          r: BULLET_R * 0.72,
          maxBounce: 1,
          split: 0,
          dmg: 1, // volume, not punch
        });
      }
      return out;
    },
  },

  orb: {
    id: "orb",
    name: "orb",
    tag: "heavy",
    shotDesc: "slow orb, bounces walls twice",
    chargeDesc: "seam-breaker — splits into three at the seam",
    shipSpeed: 0.85,
    ammoMax: 3,
    regen: 0.55,
    // orb shots are dear: tap 1, charged split costs 3
    cost: (c) => (c > 0.5 ? 3 : c > 0.05 ? 2 : 1),
    fire(me, charge) {
      const split = charge > 0.5 ? 1 : 0;
      return [
        {
          dx: 0,
          vx: me.vx * 0.2,
          vy: BASE_VY * (0.62 + 0.25 * charge),
          r: BULLET_R * (1.9 + 1.1 * charge),
          ax: 0,
          maxBounce: 2,
          split,
          dmg: 2, // slow and dear, so it slams
        },
      ];
    },
  },
};

export const FIGHTER_IDS = Object.keys(FIGHTERS);

export function getFighter(id) {
  return FIGHTERS[id] || FIGHTERS.dart;
}

// Seam-split children: deterministic on both sims (parent params only).
// Called when a bullet with split=1 crosses the seam; returns child specs
// in the SAME frame as the parent.
export function splitChildren(parent) {
  const dir = Math.sign(parent.vy) || 1;
  return [-1, 0, 1].map((k) => ({
    x: parent.x,
    y: parent.y,
    vx: parent.vx + k * 0.22,
    vy: parent.vy * 1.15,
    ax: 0,
    r: parent.r * 0.55,
    charge: parent.charge,
    maxBounce: 1,
    split: 0,
    dmg: 1,
    dirHint: dir,
  }));
}
