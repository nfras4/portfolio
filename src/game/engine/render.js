// SEAM canvas renderer — 2D primitives only, themed via the site's CSS
// custom properties (read from the canvas's computed style so light/dark and
// the game-scoped --seam-opp both resolve correctly).
import { SHIP_Y, SHIP_R } from "./sim.js";

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
  const rect = r.canvas.getBoundingClientRect();
  r.dpr = Math.min(2, window.devicePixelRatio || 1);
  r.w = Math.max(1, Math.round(rect.width));
  r.h = Math.max(1, Math.round(rect.height));
  r.canvas.width = r.w * r.dpr;
  r.canvas.height = r.h * r.dpr;
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

export function draw(r, sim) {
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

  // opponent ghost: faint tick at my top edge at mirrored x
  if (sim.opp.seen) {
    const ox = sim.opp.x * w;
    ctx.fillStyle = colors.opp;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(ox, 12);
    ctx.lineTo(ox - 7, 1.5);
    ctx.lineTo(ox + 7, 1.5);
    ctx.closePath();
    ctx.fill();
    // their charge, telegraphed as a thin bar under the tick
    if (sim.opp.charge > 0.02) {
      ctx.fillRect(ox - 10, 15, 20 * sim.opp.charge, 2);
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
  }

  // my ship: chevron pointing up
  const mx = sim.me.x * w;
  const my = sy(r, SHIP_Y);
  const s = SHIP_R * w;
  ctx.globalAlpha = sim.me.alive ? 1 : 0.25;
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.moveTo(mx, my - s * 1.25);
  ctx.lineTo(mx + s, my + s * 0.75);
  ctx.lineTo(mx, my + s * 0.15);
  ctx.lineTo(mx - s, my + s * 0.75);
  ctx.closePath();
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
  }
  ctx.globalAlpha = 1;

  // cooldown hint: tiny bar under the ship
  if (sim.time < sim.me.cooldownUntil) {
    const frac = 1 - (sim.me.cooldownUntil - sim.time) / 0.28;
    ctx.fillStyle = colors.muted;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(mx - 12, my + s * 1.4, 24 * frac, 2);
    ctx.globalAlpha = 1;
  }
}
