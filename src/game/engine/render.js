// SEAM canvas renderer — 2D primitives only, themed via the site's CSS
// custom properties (read from the canvas's computed style so light/dark and
// the game-scoped --seam-opp both resolve correctly).
import { SHIP_R, Y_MAX, HP_MAX } from "./sim.js";
import { getFighter } from "./fighters.js";

export function createRenderer(canvas) {
  const r = {
    canvas,
    ctx: canvas.getContext("2d"),
    w: 0,
    h: 0,
    dpr: 1,
    colors: null,
    shakeUntil: 0,
    shakeMag: 0,
    reduceMotion:
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
  readColors(r);
  resize(r);
  return r;
}

export function readColors(r) {
  const cs = getComputedStyle(r.canvas);
  const v = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
  r.colors = {
    bg: v("--bg", "#111"),
    text: v("--text", "#eee"),
    muted: v("--muted", "#888"),
    line: v("--line", "#444"),
    accent: v("--accent", "#e0a840"),
    opp: v("--seam-opp", "oklch(0.74 0.09 235)"),
  };
}

export function resize(r) {
  // clientWidth/Height are LAYOUT sizes, unaffected by CSS transforms — the
  // landscape fallback rotates the stage 90°, and getBoundingClientRect of a
  // rotated element returns the axis-aligned box (w/h swapped).
  r.dpr = Math.min(2, window.devicePixelRatio || 1);
  r.w = Math.max(1, r.canvas.clientWidth);
  r.h = Math.max(1, r.canvas.clientHeight);
  r.canvas.width = Math.max(1, Math.round(r.w * r.dpr));
  r.canvas.height = Math.max(1, Math.round(r.h * r.dpr));
}

export function shake(r) {
  if (r.reduceMotion) return;
  r.shakeUntil = performance.now() + 180;
  r.shakeMag = 7;
}

// local y ∈ [0,1] → screen: baseline at bottom, seam at top
function sy(r, y) {
  return (1 - y) * r.h;
}

// per-fighter ship glyphs, drawn around (x,y) with scale s
function drawShip(ctx, fighterId, x, y, s) {
  ctx.beginPath();
  if (fighterId === "swarm") {
    // slim swept dart with side fins
    ctx.moveTo(x, y - s * 1.45);
    ctx.lineTo(x + s * 0.55, y + s * 0.35);
    ctx.lineTo(x + s * 1.1, y + s * 0.9);
    ctx.lineTo(x + s * 0.25, y + s * 0.55);
    ctx.lineTo(x, y + s * 0.25);
    ctx.lineTo(x - s * 0.25, y + s * 0.55);
    ctx.lineTo(x - s * 1.1, y + s * 0.9);
    ctx.lineTo(x - s * 0.55, y + s * 0.35);
    ctx.closePath();
  } else if (fighterId === "orb") {
    // hex hull
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 3;
      const px = x + Math.cos(a) * s * 1.05;
      const py = y + Math.sin(a) * s * 1.05;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else {
    // dart: the original chevron
    ctx.moveTo(x, y - s * 1.25);
    ctx.lineTo(x + s, y + s * 0.75);
    ctx.lineTo(x, y + s * 0.15);
    ctx.lineTo(x - s, y + s * 0.75);
    ctx.closePath();
  }
}

export function draw(r, sim, inMatch = true) {
  const { ctx, w, h, colors } = r;
  ctx.setTransform(r.dpr, 0, 0, r.dpr, 0, 0);

  // screen shake
  const now = performance.now();
  if (now < r.shakeUntil) {
    const k = (r.shakeUntil - now) / 180;
    ctx.translate(
      (Math.random() * 2 - 1) * r.shakeMag * k,
      (Math.random() * 2 - 1) * r.shakeMag * k
    );
  }

  ctx.fillStyle = colors.bg;
  ctx.fillRect(-16, -16, w + 32, h + 32);

  // seam — the top edge, where the two phones meet
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(0, 1.5);
  ctx.lineTo(w, 1.5);
  ctx.stroke();
  ctx.setLineDash([]);

  // side walls, faint
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(0.5, 0);
  ctx.lineTo(0.5, h);
  ctx.moveTo(w - 0.5, 0);
  ctx.lineTo(w - 0.5, h);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // opponent ghost: tick at my top edge at mirrored x. Their depth (how close
  // they've pushed toward the seam) scales the tick — big tick = they're near,
  // their shots arrive sooner.
  if (sim.opp.seen) {
    const ox = sim.opp.x * w;
    const near = Math.min(1, Math.max(0, sim.opp.depth / Y_MAX)); // 0 far, 1 at seam
    const tick = 8 + near * 10;
    ctx.fillStyle = colors.opp;
    ctx.globalAlpha = 0.35 + near * 0.4;
    ctx.beginPath();
    ctx.moveTo(ox, tick + 4);
    ctx.lineTo(ox - tick * 0.6, 1.5);
    ctx.lineTo(ox + tick * 0.6, 1.5);
    ctx.closePath();
    ctx.fill();
    // their charge, telegraphed as a thin bar under the tick
    if (sim.opp.charge > 0.02) {
      ctx.fillRect(ox - 10, tick + 7, 20 * sim.opp.charge, 2);
    }
    ctx.globalAlpha = 1;
  }

  // bullets (render only what's inside my half, plus a small overhang)
  for (const b of sim.bullets) {
    if (b.dead || b.y > 1.06) continue;
    const bx = b.x * w;
    const by = sy(r, b.y);
    const rad = b.r * w;
    const col = b.mine ? colors.accent : colors.opp;

    // short trail from recent positions
    if (b.trail.length >= 4) {
      const tx = b.trail[0] * w;
      const ty = sy(r, b.trail[1]);
      const grad = ctx.createLinearGradient(tx, ty, bx, by);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(1, col);
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(1.5, rad * 0.9);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(bx, by, rad, 0, Math.PI * 2);
    ctx.fill();
    // seam-breaker orbs get a warning ring
    if (b.split) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(now / 90);
      ctx.beginPath();
      ctx.arc(bx, by, rad + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // my ship (blinks briefly after taking chip damage)
  const mx = sim.me.x * w;
  const my = sy(r, sim.me.y);
  const s = SHIP_R * w;
  const hurtBlink =
    sim.time < sim.me.hurtUntil && Math.floor(now / 90) % 2 === 0;
  ctx.globalAlpha = sim.me.alive ? (hurtBlink ? 0.35 : 1) : 0.25;
  ctx.fillStyle = colors.accent;
  drawShip(ctx, sim.fighter, mx, my, s);
  ctx.fill();

  // charge ring
  if (sim.me.charging && sim.me.charge > 0.01) {
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx, my, s * 2.1, -Math.PI / 2, -Math.PI / 2 + sim.me.charge * Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(mx, my, s * 2.1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.globalAlpha = 1;

  // dry-fire flash: hollow blink under the ship when out of ammo
  if (sim.time < sim.me.dryUntil) {
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(mx, my + s * 2, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // cooldown hint: tiny bar under the ship
  if (sim.time < sim.me.cooldownUntil) {
    const frac = 1 - (sim.me.cooldownUntil - sim.time) / 0.26;
    ctx.fillStyle = colors.muted;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(mx - 12, my + s * 1.4, 24 * frac, 2);
    ctx.globalAlpha = 1;
  }

  // ammo pips, bottom-left: filled diamonds + a partial for the regenerating one
  if (!inMatch) return;
  const f = getFighter(sim.fighter);
  const px0 = 16;
  const py0 = h - 18;
  for (let i = 0; i < f.ammoMax; i++) {
    const cx = px0 + i * 16;
    const fill = Math.min(1, Math.max(0, sim.me.ammo - i));
    ctx.globalAlpha = fill >= 1 ? 0.95 : 0.2 + fill * 0.55;
    ctx.fillStyle = fill >= 1 ? colors.accent : colors.muted;
    ctx.beginPath();
    ctx.moveTo(cx, py0 - 5);
    ctx.lineTo(cx + 5, py0);
    ctx.lineTo(cx, py0 + 5);
    ctx.lineTo(cx - 5, py0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // hp bars: mine above the ammo rack, theirs bottom-right in their color
  const bar = (x0, y0, i, on, col) => {
    ctx.globalAlpha = on ? 0.95 : 0.18;
    ctx.fillStyle = on ? col : colors.muted;
    ctx.fillRect(x0 + i * 15, y0, 11, 4);
  };
  for (let i = 0; i < HP_MAX; i++) bar(px0 - 5, py0 - 20, i, i < sim.me.hp, colors.accent);
  if (sim.opp.seen) {
    const ox0 = w - 16 - HP_MAX * 15 + 4;
    for (let i = 0; i < HP_MAX; i++) bar(ox0, py0 - 2, i, i < sim.opp.hp, colors.opp);
  }
  ctx.globalAlpha = 1;
}
