import Lenis from 'lenis';

/**
 * Initialise Lenis smooth scroll.
 *
 * Caller must invoke this from inside a `$effect` block (Svelte 5 runes mode)
 * because it touches `window` and DOM APIs. The returned cleanup function
 * MUST be returned from the `$effect` callback so Lenis is destroyed on
 * teardown. Never call from `onMount` or `onDestroy`: those are tree-shaken
 * in production runes builds.
 *
 * Returns `null` (and a no-op cleanup) when the user prefers reduced motion
 * or when called server-side.
 */
export function initLenis(): () => void {
	if (typeof window === 'undefined') {
		return () => {};
	}

	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		return () => {};
	}

	const lenis = new Lenis({
		duration: 1.1,
		easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
		smoothWheel: true
	});

	let rafId = 0;
	function raf(time: number) {
		lenis.raf(time);
		rafId = requestAnimationFrame(raf);
	}
	rafId = requestAnimationFrame(raf);

	return () => {
		cancelAnimationFrame(rafId);
		lenis.destroy();
	};
}
