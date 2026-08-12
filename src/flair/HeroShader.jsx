import { useEffect, useRef } from "react";
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

  useThemeChange(() => {
    const s = stateRef.current;
    if (s.setColor) {
      s.setColor();
      if (s.staticMode) s.drawFrame(7, STATIC_ALPHA);
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
      powerPreference: "low-power",
    });
    if (!gl) return; // no WebGL2 → plain hero, no shader

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
    s.staticMode = reduced;

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
      if (s.staticMode) s.drawFrame(7, STATIC_ALPHA);
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

    if (s.staticMode) {
      s.drawFrame(7, STATIC_ALPHA);
    } else {
      start();
    }

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [reduced]);

  return <canvas ref={canvasRef} className="hero-shader" aria-hidden="true" />;
}
