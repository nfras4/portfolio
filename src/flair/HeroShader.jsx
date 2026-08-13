import { useEffect, useRef, useState } from "react";
import { cssVarToRGB, usePrefersReducedMotion, useThemeChange } from "./hooks.js";
import "./flair.css";

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform vec2 u_res;
uniform float u_time;
uniform float u_alpha;
uniform vec3 u_color;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}
void main() {
  vec2 uv = vUv;
  uv.x *= u_res.x / u_res.y;
  vec2 p = uv * 6.5 + vec2(u_time * 0.10, u_time * 0.04);
  float h = fbm(p);
  float g = abs(fract(h * 10.0) - 0.5) / fwidth(h * 10.0);
  float line = 1.0 - smoothstep(0.0, 1.1, g);
  fragColor = vec4(u_color, line * u_alpha);
}`;

const VERT = `#version 300 es
out vec2 vUv;
void main() {
  float x = -1.0 + float((gl_VertexID & 1) << 2);
  float y = -1.0 + float((gl_VertexID & 2) << 1);
  vUv = vec2(x, y) * 0.5 + 0.5;
  gl_Position = vec4(x, y, 0.0, 1.0);
}`;

const FPS_INTERVAL = 1000 / 30;
const FADE_PERIOD_S = 16; // one full fade-in/out cycle
const ALPHA_MIN = 0.05;
const ALPHA_MAX = 0.30;
const STATIC_ALPHA = 0.14;
// ≤880px: no rAF loop (battery), one brighter static frame so the texture
// actually reads on a narrow screen.
const MOBILE_MQ = "(max-width: 880px)";
const MOBILE_STATIC_ALPHA = 0.18;

/**
 * Fractal-terrain contour shader (ported from the six-panel generative study,
 * middle-bottom panel) rendered as a hero background layer. Slowly fades in
 * and out so it never competes with the headline. Pauses off-screen and in
 * hidden tabs; renders a single static frame under prefers-reduced-motion.
 */
export default function HeroShader() {
  const canvasRef = useRef(null);
  const stateRef = useRef({});
  const reduced = usePrefersReducedMotion();
  // Bumped when a lost WebGL context is restored so the effect re-runs.
  // Covers StrictMode's dev double-mount (cleanup loses the context, the
  // remount gets the same dead one back) and real GPU context loss on phones.
  const [glEpoch, setGlEpoch] = useState(0);

  useThemeChange(() => {
    const s = stateRef.current;
    if (s.setColor) {
      s.setColor();
      if (s.staticMode) s.drawFrame(7, s.staticAlpha ?? STATIC_ALPHA);
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Persistent guard, once per canvas element: the browser refuses
    // restoreContext() unless webglcontextlost was preventDefault'ed, and the
    // loss happens during effect teardown — after per-effect listeners are gone.
    if (!canvas.dataset.glGuard) {
      canvas.dataset.glGuard = "1";
      canvas.addEventListener("webglcontextlost", (e) => e.preventDefault());
    }
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
      powerPreference: "low-power",
    });
    if (!gl) return; // no WebGL2 → plain hero, no shader
    if (gl.isContextLost()) {
      // getExtension returns null on a lost context — restore needs the ext
      // object stashed while the context was healthy (stateRef survives the
      // StrictMode remount).
      const ext = stateRef.current.loseExt;
      if (!ext) return;
      const onRestored = () => setGlEpoch((n) => n + 1);
      canvas.addEventListener("webglcontextrestored", onRestored, { once: true });
      // The webglcontextlost event dispatches as a task AFTER the synchronous
      // cleanup→effect re-run; restoring before it fires warns "not allowed"
      // and no-ops (it doesn't throw). Retry on a short timer until it takes.
      let tries = 0;
      let timer = 0;
      const tryRestore = () => {
        if (!gl.isContextLost()) return; // done; the restored event re-runs us
        ext.restoreContext();
        if (++tries < 5) timer = setTimeout(tryRestore, 50);
      };
      timer = setTimeout(tryRestore, 0);
      return () => {
        clearTimeout(timer);
        canvas.removeEventListener("webglcontextrestored", onRestored);
      };
    }

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uAlpha = gl.getUniformLocation(prog, "u_alpha");
    const uColor = gl.getUniformLocation(prog, "u_color");

    const s = stateRef.current;
    s.loseExt = gl.getExtension("WEBGL_lose_context");
    // Static (single-frame) mode when the user prefers reduced motion OR on
    // mobile-width viewports; mobile gets a brighter frame so it reads.
    const mobileMq = window.matchMedia(MOBILE_MQ);
    const applyMode = () => {
      // Nick 2026-08-13: animate on mobile too — static only under reduced motion.
      s.staticMode = reduced;
      s.staticAlpha = mobileMq.matches ? MOBILE_STATIC_ALPHA : STATIC_ALPHA;
    };
    applyMode();

    s.setColor = () => {
      const [r, g, b] = cssVarToRGB("--accent");
      gl.uniform3f(uColor, r, g, b);
    };
    s.setColor();

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      // Render at reduced resolution; the contour lines upscale cleanly.
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.7;
      const w = Math.max(1, Math.round(parent.clientWidth * scale));
      const h = Math.max(1, Math.round(parent.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    };
    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (s.staticMode) s.drawFrame(7, s.staticAlpha);
    });
    ro.observe(canvas.parentElement);

    s.drawFrame = (t, alpha) => {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uAlpha, alpha);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let raf = 0;
    let running = false;
    let visible = true;
    let lastFrame = 0;

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (now - lastFrame < FPS_INTERVAL) return;
      lastFrame = now;
      const t = now * 0.001;
      const cycle = 0.5 + 0.5 * Math.sin((t * Math.PI * 2) / FADE_PERIOD_S);
      s.drawFrame(t * 0.35, ALPHA_MIN + (ALPHA_MAX - ALPHA_MIN) * cycle);
    };

    const start = () => {
      if (running || s.staticMode || !visible || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      visible ? start() : stop();
    });
    io.observe(canvas);

    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);

    // Live context loss (GPU reset, backgrounded mobile tab): stop drawing,
    // let the browser restore, then re-run the effect via the epoch bump.
    const onCtxLost = (e) => {
      e.preventDefault(); // required, or webglcontextrestored never fires
      stop();
    };
    const onCtxRestored = () => setGlEpoch((n) => n + 1);
    canvas.addEventListener("webglcontextlost", onCtxLost);
    canvas.addEventListener("webglcontextrestored", onCtxRestored);

    // Flip between animated and static when the viewport crosses 880px.
    const onMqChange = () => {
      applyMode();
      if (s.staticMode) {
        stop();
        s.drawFrame(7, s.staticAlpha);
      } else {
        start();
      }
    };
    mobileMq.addEventListener("change", onMqChange);

    if (s.staticMode) {
      s.drawFrame(7, s.staticAlpha);
    } else {
      start();
    }

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      mobileMq.removeEventListener("change", onMqChange);
      // Listeners must go BEFORE loseContext, or our own teardown re-triggers
      // the restore cycle.
      canvas.removeEventListener("webglcontextlost", onCtxLost);
      canvas.removeEventListener("webglcontextrestored", onCtxRestored);
      s.loseExt?.loseContext();
    };
  }, [reduced, glEpoch]);

  return <canvas ref={canvasRef} className="hero-shader" aria-hidden="true" />;
}
