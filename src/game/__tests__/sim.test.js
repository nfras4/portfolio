// Balance contract for the 2026-08-14 changes: HP halved, projectile speed
// doubled, armour (ammo) regen raised, first-to-3 matches. Pure sim — no DOM.
// Run: bun test src/game/__tests__/sim.test.js
import { describe, test, expect } from "bun:test";
import {
  createSim, resetRound, advance, startCharge, releaseCharge, spawnRemote,
  HP_MAX, WIN_SCORE, SHIP_START_Y,
} from "../engine/sim.js";
import { FIGHTERS, getFighter } from "../engine/fighters.js";

describe("hp", () => {
  test("HP_MAX is 3 (halved from 6)", () => {
    expect(HP_MAX).toBe(3);
  });

  test("a fresh ship carries 3 hp and dies to tap(1) + charged slug(2)", () => {
    const sim = createSim("dart");
    expect(sim.me.hp).toBe(3);
    // incoming shooter-frame bullets aimed straight down my ship's lane
    const shot = (id, dmg) =>
      spawnRemote(
        sim,
        { id, x: 0.5, y: 1.6, vx: 0, vy: 2.2, ax: 0, r: 0.011, charge: 0, mb: 1, sp: 0, dmg },
        0
      );
    shot(1, 1);
    for (let i = 0; i < 240 && sim.me.hp === 3; i++) advance(sim, 1 / 120);
    expect(sim.me.hp).toBe(2);
    expect(sim.me.alive).toBe(true);
    shot(2, 2);
    for (let i = 0; i < 240 && sim.me.alive; i++) advance(sim, 1 / 120);
    expect(sim.me.hp).toBe(0);
    expect(sim.me.alive).toBe(false);
  });
});

describe("match length", () => {
  test("WIN_SCORE is 3 (first-to-3, was first-to-5)", () => {
    expect(WIN_SCORE).toBe(3);
  });
});

describe("projectile speed (doubled)", () => {
  // pre-change forward speeds: BASE_VY was 1.1; these assert exactly 2×
  test("dart quick bolt flies at 2.2 (was 1.1)", () => {
    const [b] = FIGHTERS.dart.fire({ x: 0.5, y: 0.12, vx: 0 }, 0);
    expect(b.vy).toBeCloseTo(2.2, 5);
  });

  test("dart full-charge slug flies at 4.18 (was 2.09)", () => {
    const [b] = FIGHTERS.dart.fire({ x: 0.5, y: 0.12, vx: 0 }, 1);
    expect(b.vy).toBeCloseTo(2.2 * 1.9, 5);
  });

  test("swarm darts fly at 2.596 (was 1.298)", () => {
    const out = FIGHTERS.swarm.fire({ x: 0.5, y: 0.12, vx: 0 }, 0);
    expect(out).toHaveLength(3);
    for (const b of out) expect(b.vy).toBeCloseTo(2.2 * 1.18, 5);
  });

  test("orb tap flies at 1.364 (was 0.682)", () => {
    const [b] = FIGHTERS.orb.fire({ x: 0.5, y: 0.12, vx: 0 }, 0);
    expect(b.vy).toBeCloseTo(2.2 * 0.62, 5);
  });

  test("swarm fan keeps its spatial path: lateral drift per unit of forward travel unchanged", () => {
    // outermost dart: x(t)=vx·t+½ax·t², y(t)=vy·t. At the moment it reaches
    // y-distance D, lateral offset must equal the pre-change value
    // (vx 0.26, ax -0.18·2, vy 1.298 for t at same D).
    const out = FIGHTERS.swarm.fire({ x: 0.5, y: 0.12, vx: 0 }, 0);
    const b = out[2]; // t=+0.5 outer dart
    const D = 0.9;
    const tNew = D / b.vy;
    const lateralNew = b.vx * tNew + 0.5 * b.ax * tNew * tNew;
    const oldVy = 1.298, oldVx = 0.26, oldAx = -0.5 * 2 * 0.18; // pre-change outer dart
    const tOld = D / oldVy;
    const lateralOld = oldVx * tOld + 0.5 * oldAx * tOld * tOld;
    expect(lateralNew).toBeCloseTo(lateralOld, 5);
  });
});

describe("armour regen (raised)", () => {
  test.each([
    ["dart", 1.2],
    ["swarm", 1.65],
    ["orb", 0.85],
  ])("%s regenerates %p units/s", (id, rate) => {
    expect(FIGHTERS[id].regen).toBeCloseTo(rate, 5);
  });

  test("regen is applied continuously in the sim at the fighter's rate", () => {
    const sim = createSim("dart");
    // fire a quick shot to spend 1 ammo (tap = held under 150 ms)
    startCharge(sim);
    advance(sim, 0.05);
    const spawned = releaseCharge(sim);
    expect(spawned.length).toBe(1);
    const after = sim.me.ammo;
    expect(after).toBeLessThan(getFighter("dart").ammoMax);
    // advance() clamps elapsed to 0.25 s per call (tab-switch guard) — step
    // in frame-sized increments like the real loop does
    for (let i = 0; i < 60; i++) advance(sim, 1 / 120);
    expect(sim.me.ammo - after).toBeCloseTo(0.5 * 1.2, 2);
  });

  test("round reset restores full ammo and hp", () => {
    const sim = createSim("dart");
    sim.me.hp = 1;
    sim.me.ammo = 0;
    resetRound(sim);
    expect(sim.me.hp).toBe(HP_MAX);
    expect(sim.me.ammo).toBe(getFighter("dart").ammoMax);
    expect(sim.me.y).toBe(SHIP_START_Y);
  });
});
