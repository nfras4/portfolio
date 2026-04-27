import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

/**
 * Register GSAP plugins once.
 *
 * Safe to call repeatedly: subsequent calls are no-ops. SSR-safe: skips
 * registration when `window` is undefined since ScrollTrigger needs the DOM.
 * Caller must invoke this from inside a `$effect` block in Svelte 5 runes
 * components.
 */
export function registerGsap(): typeof gsap {
	if (typeof window === 'undefined') {
		return gsap;
	}
	if (!registered) {
		gsap.registerPlugin(ScrollTrigger);
		registered = true;
	}
	return gsap;
}

/**
 * Simple in-view reveal for an array of elements. Each element fades in and
 * translates up ~16px when its top hits 85% of the viewport. One-shot only,
 * no scrub, no pin.
 *
 * On `prefers-reduced-motion: reduce` the elements are set to their final
 * state immediately and no ScrollTriggers are created.
 *
 * Returns a cleanup function that kills any ScrollTriggers created here. The
 * caller (typically a Svelte `$effect`) must invoke this in its teardown so
 * HMR and unmount do not leak triggers. Pair with `gsap.context()` if other
 * tweens are created in the same effect.
 *
 * Must only be called inside a `$effect` block (browser-only).
 */
export function revealOnScroll(elements: HTMLElement[]): () => void {
	if (typeof window === 'undefined' || elements.length === 0) {
		return () => {};
	}

	registerGsap();

	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	if (reducedMotion) {
		gsap.set(elements, { autoAlpha: 1, y: 0 });
		return () => {};
	}

	const triggers: ScrollTrigger[] = [];

	elements.forEach((el) => {
		const tween = gsap.from(el, {
			autoAlpha: 0,
			y: 16,
			duration: 0.6,
			ease: 'power2.out',
			scrollTrigger: {
				trigger: el,
				start: 'top 85%',
				once: true
			}
		});
		const st = tween.scrollTrigger;
		if (st) triggers.push(st);
	});

	return () => {
		triggers.forEach((t) => t.kill());
	};
}

export { gsap, ScrollTrigger };
