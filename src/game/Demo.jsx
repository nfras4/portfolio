// SEAM menu demo — a looping, scripted picture of how the game is played:
// two phones face each other across the seam, tilting to steer; held shots
// charge up, and a bullet that leaves one screen crosses onto the other.
// Pure canvas, themed via the site's CSS custom properties, no assets.
import { useEffect, useRef } from "react";

const LOOP = 9; // seconds per cycle
const QUICK_V = 150; // bullet speed px/s
const CHARGED_V = 210;
const EASE = 3.5; // ship approach rate toward its target, 1/s

// choreography: three exchanges — a charged miss, a quick miss, a charged hit
const SHOTS = [
  { t: 0.9, side: "a", chargeDur: 1.2 },
  { t: 3.9, side: "b", chargeDur: 0 },
  { t: 5.6, side: "a", chargeDur: 0.9 },
];
const MOVES = [
  { t: 2.8, side: "b", dodge: true },
  { t: 4.8, side: "a", dodge: true },
  { t: 5.4, side: "b", target: 20 }, // wanders into A's firing lane — the hit
];
const SETTLE_T = 8.2; // both ships drift home so the loop wraps seamlessly

function mkState() {
  return {
    a: { y: 0, target: 4, vy: 0, blinkUntil: 0 },
    b: { y: 0, target: -6, vy: 0, blinkUntil: 0 },
    bullets: [], // {x, y, vx, r, side}
    fired: [false, false, false],
    dodged: [false, false, false],
    settled: false,
    hit: null, // {x, y, t}
    shakeUntil: 0,
  };
}

function readColors(canvas) {
  const cs = getComputedStyle(canvas);
  const v = (name, fb) => cs.getPropertyValue(name).trim() || fb;
  return {
    text: v("--text", "#eee"),
    muted: v("--muted", "#888"),
    line: v("--line", "#444"),
    faint: v("--faint", "#666"),
    bg2: v("--bg-2", "rgba(128,128,128,0.06)"),
    accent: v("--accent", "#e0a840"),
    opp: v("--seam-opp", "oklch(0.74 0.09 235)"),
  };
}

// chevron ship pointing toward +x, drawn around origin with scale s
function shipPath(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(s * 1.25, 0);
  ctx.lineTo(-s * 0.75, s);
  ctx.lineTo(-s * 0.15, 0);
  ctx.lineTo(-s * 0.75, -s);
  ctx.closePath();
}

export default function SeamDemo() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    let colors = readColors(canvas);
    let w = 0;
    let h = 0;
    let dpr = 1;

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      colors = readColors(canvas);
    };
    measure();
    window.addEventListener("resize", measure);

    let state = mkState();
    let prevT = 0;

    // geometry, derived from the current canvas size
    const geo = () => {
      const gap = 30;
      const pw = Math.min(122, (w - gap) / 2 - 10);
      const ph = Math.min(h - 24, pw * 0.68);
      return {
        gap, pw, ph,
        ax: w / 2 - gap / 2 - pw / 2, // left phone center x
        bx: w / 2 + gap / 2 + pw / 2,
        cy: h / 2,
        shipInset: 17,
        range: ph / 2 - 14, // ship y travel inside a phone
      };
    };

    const shipWorld = (g, side, ship) => ({
      x: side === "a" ? g.ax - g.pw / 2 + g.shipInset : g.bx + g.pw / 2 - g.shipInset,
      y: g.cy + Math.max(-g.range, Math.min(g.range, ship.y)),
    });

    const chargeAt = (t, side) => {
      // charge progress of this side's active shot at time t, or 0
      for (const s of SHOTS) {
        if (s.side !== side || s.chargeDur <= 0) continue;
        if (t >= s.t && t < s.t + s.chargeDur) return (t - s.t) / s.chargeDur;
      }
      return 0;
    };

    const stepSim = (t, dt) => {
      const g = geo();
      const S = state;
      // fire + dodge events
      SHOTS.forEach((s, i) => {
        const fireT = s.t + s.chargeDur;
        if (!S.fired[i] && t >= fireT) {
          S.fired[i] = true;
          const ship = S[s.side];
          const p = shipWorld(g, s.side, ship);
          const charged = s.chargeDur > 0;
          S.bullets.push({
            x: p.x, y: p.y,
            vx: (s.side === "a" ? 1 : -1) * (charged ? CHARGED_V : QUICK_V),
            r: charged ? 5 : 3.5,
            side: s.side,
          });
        }
      });
      MOVES.forEach((d, i) => {
        if (!S.dodged[i] && t >= d.t) {
          S.dodged[i] = true;
          const ship = S[d.side];
          if (d.dodge) {
            const incoming = S.bullets.find((b) => b.side !== d.side);
            const lane = incoming ? incoming.y - g.cy : 0;
            ship.target = lane > 0 ? -g.range + 4 : g.range - 4;
          } else {
            ship.target = d.target;
          }
        }
      });
      if (!S.settled && t >= SETTLE_T) {
        S.settled = true;
        S.a.target = 4;
        S.b.target = -6;
      }
      // ships ease toward their targets; lean follows velocity
      for (const side of ["a", "b"]) {
        const ship = S[side];
        const before = ship.y;
        ship.y += (ship.target - ship.y) * Math.min(1, dt * EASE);
        ship.vy = dt > 0 ? (ship.y - before) / dt : 0;
      }
      // bullets fly; the late dodge gets caught
      for (const b of S.bullets) {
        b.x += b.vx * dt;
        const defender = b.side === "a" ? "b" : "a";
        const p = shipWorld(g, defender, S[defender]);
        if (Math.abs(b.x - p.x) < 9 && Math.abs(b.y - p.y) < b.r + 8) {
          S.hit = { x: p.x, y: p.y, t };
          S[defender].blinkUntil = t + 0.9;
          S.shakeUntil = t + 0.3;
          b.dead = true;
        }
      }
      S.bullets = S.bullets.filter((b) => !b.dead && b.x > -20 && b.x < w + 20);
    };

    const drawPhone = (g, side, ship, t) => {
      const cx = side === "a" ? g.ax : g.bx;
      const lean = Math.max(-0.13, Math.min(0.13, ship.vy * 0.0015)) * (side === "a" ? 1 : -1);
      const shaking = side === "b" && t < state.shakeUntil;
      ctx.save();
      ctx.translate(
        cx + (shaking ? (Math.random() * 2 - 1) * 2.5 : 0),
        g.cy + (shaking ? (Math.random() * 2 - 1) * 2.5 : 0)
      );
      ctx.rotate(lean);
      // body
      ctx.strokeStyle = colors.line;
      ctx.fillStyle = colors.bg2;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-g.pw / 2, -g.ph / 2, g.pw, g.ph, 9);
      else ctx.rect(-g.pw / 2, -g.ph / 2, g.pw, g.ph);
      ctx.fill();
      ctx.stroke();
      // home-bar nub on the outer (baseline) edge
      ctx.strokeStyle = colors.faint;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const nubX = side === "a" ? -g.pw / 2 + 5 : g.pw / 2 - 5;
      ctx.moveTo(nubX, -8);
      ctx.lineTo(nubX, 8);
      ctx.stroke();
      // ship
      const col = side === "a" ? colors.accent : colors.opp;
      const localX = (side === "a" ? -1 : 1) * (g.pw / 2 - g.shipInset);
      const localY = Math.max(-g.range, Math.min(g.range, ship.y));
      const blink = t < ship.blinkUntil && Math.floor(t * 11) % 2 === 0;
      ctx.globalAlpha = blink ? 0.25 : 1;
      ctx.fillStyle = col;
      ctx.save();
      ctx.translate(localX, localY);
      if (side === "b") ctx.rotate(Math.PI);
      shipPath(ctx, 6.5);
      ctx.fill();
      ctx.restore();
      // charge ring
      const c = chargeAt(t, side);
      if (c > 0.02) {
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(localX, localY, 11, -Math.PI / 2, -Math.PI / 2 + c * Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    const drawFrame = (t) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const g = geo();

      // the seam — dashed, between the phones
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(w / 2, g.cy - g.ph / 2 - 4);
      ctx.lineTo(w / 2, g.cy + g.ph / 2 + 4);
      ctx.stroke();
      ctx.setLineDash([]);

      drawPhone(g, "a", state.a, t);
      drawPhone(g, "b", state.b, t);

      // bullets, with a short trail; the seam glows where one crosses
      for (const b of state.bullets) {
        const col = b.side === "a" ? colors.accent : colors.opp;
        const tail = -Math.sign(b.vx) * (b.r * 4 + 6);
        const grad = ctx.createLinearGradient(b.x + tail, b.y, b.x, b.y);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(1, col);
        ctx.strokeStyle = grad;
        ctx.lineWidth = Math.max(1.5, b.r * 0.8);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(b.x + tail, b.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        if (Math.abs(b.x - w / 2) < 9) {
          ctx.globalAlpha = 0.7;
          ctx.strokeStyle = col;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(w / 2, b.y - 8);
          ctx.lineTo(w / 2, b.y + 8);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // hit flash: an expanding ring
      if (state.hit && t - state.hit.t < 0.4) {
        const k = (t - state.hit.t) / 0.4;
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(state.hit.x, state.hit.y, 4 + k * 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    };

    const reduceMotion =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    if (reduceMotion) {
      // static frame: charged bullet caught mid-crossing
      for (let t = 0; t < 2.65; t += 1 / 60) stepSim(t, 1 / 60);
      drawFrame(2.65);
    } else {
      const start = performance.now();
      const frame = (now) => {
        const t = ((now - start) / 1000) % LOOP;
        if (t < prevT) state = mkState(); // wrapped — clean slate
        stepSim(t, Math.max(0, Math.min(0.05, t - prevT)));
        prevT = t;
        drawFrame(t);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return <canvas ref={canvasRef} className="seam-demo" aria-hidden="true" />;
}
