import { useEffect, useRef, useState } from "react";

/** True when the user prefers reduced motion; tracks live changes. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Becomes true once the ref'd element approaches the viewport, then stays true (lazy mount). */
export function useNearViewport(ref, rootMargin = "300px") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near || !ref.current) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setNear(true)),
      { rootMargin }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [near, ref, rootMargin]);
  return near;
}

/**
 * Resolve a CSS custom property to [r, g, b] in 0..1 by painting it to a
 * 1px canvas (handles oklch()/color-mix() values the way the browser does).
 */
export function cssVarToRGB(varName, fallback = [0.5, 0.4, 0.3]) {
  try {
    const probe = document.createElement("span");
    probe.style.color = `var(${varName})`;
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    document.body.removeChild(probe);
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = resolved;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0] / 255, d[1] / 255, d[2] / 255];
  } catch {
    return fallback;
  }
}

/** Re-run a callback when data-theme flips on <html>. */
export function useThemeChange(onChange) {
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    const mo = new MutationObserver(() => cb.current());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
}
