<script lang="ts">
	/**
	 * Hero section - Option A: cursor-reactive per-letter offset on "Nick Fraser".
	 *
	 * Each letter translates up to 5px toward the cursor. On reduced-motion or
	 * touch (hover: none) devices the letters render as plain text with no
	 * mousemove listener attached.
	 *
	 * All window/document access is gated inside $effect so it never runs
	 * during SvelteKit's static prerender pass.
	 */

	// Per-letter translation state. Initialised empty; populated in $effect.
	let offsets = $state<{ x: number; y: number }[]>([]);

	// Whether the interactive effect is active (set once in $effect).
	let interactive = $state(false);

	const NAME = 'Nick Fraser';
	const LETTERS = NAME.split('');
	const MAX_OFFSET = 5; // px

	$effect(() => {
		// Bail out on reduced-motion or touch devices.
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const touchDevice = window.matchMedia('(hover: none)').matches;

		if (reducedMotion || touchDevice) {
			return;
		}

		// Initialise offsets to zero for each letter.
		offsets = LETTERS.map(() => ({ x: 0, y: 0 }));
		interactive = true;

		// Collect span elements for position calculation.
		const spans = document.querySelectorAll<HTMLSpanElement>('[data-letter]');

		function onMouseMove(e: MouseEvent) {
			spans.forEach((span, i) => {
				const rect = span.getBoundingClientRect();
				const cx = rect.left + rect.width / 2;
				const cy = rect.top + rect.height / 2;

				// Vector from letter center to cursor.
				const dx = e.clientX - cx;
				const dy = e.clientY - cy;
				const dist = Math.sqrt(dx * dx + dy * dy);

				// Influence falls off with distance; letters within ~180px react.
				const influence = Math.max(0, 1 - dist / 180);
				const tx = dx * influence * (MAX_OFFSET / 180);
				const ty = dy * influence * (MAX_OFFSET / 180);

				offsets[i] = { x: parseFloat(tx.toFixed(2)), y: parseFloat(ty.toFixed(2)) };
			});
		}

		function onMouseLeave() {
			offsets = LETTERS.map(() => ({ x: 0, y: 0 }));
		}

		window.addEventListener('mousemove', onMouseMove, { passive: true });
		window.addEventListener('mouseleave', onMouseLeave, { passive: true });

		return () => {
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseleave', onMouseLeave);
		};
	});
</script>

<section id="hero" aria-label="Introduction">
	<div class="hero-inner">
		<h1 class="hero-name" aria-label={NAME}>
			{#each LETTERS as letter, i}
				{#if letter === ' '}
					<span class="letter-space" aria-hidden="true">&nbsp;</span>
				{:else}
					<span
						data-letter
						aria-hidden="true"
						class="letter"
						style={interactive && offsets[i]
							? `transform: translate(${offsets[i].x}px, ${offsets[i].y}px);`
							: ''}
					>{letter}</span>
				{/if}
			{/each}
		</h1>

		<p class="hero-tagline">Penultimate-year Finance student building production web apps.</p>

		<div class="hero-cta" role="group" aria-label="Primary actions">
			<a href="#arcade" class="btn btn-primary">View work</a>
			<a href="/cv.pdf" class="btn btn-secondary" aria-label="Resume (PDF download)">Resume</a>
		</div>

		<div class="scroll-cue" aria-hidden="true">
			<span class="scroll-label">scroll</span>
			<svg
				class="scroll-arrow"
				width="16"
				height="20"
				viewBox="0 0 16 20"
				fill="none"
				aria-hidden="true"
				focusable="false"
			>
				<line x1="8" y1="0" x2="8" y2="16" stroke="currentColor" stroke-width="1.5" />
				<polyline points="3,11 8,17 13,11" stroke="currentColor" stroke-width="1.5" fill="none" />
			</svg>
		</div>
	</div>
</section>

<style>
	section#hero {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 70dvh;
		padding-block: clamp(4rem, 8vw, 6rem);
		padding-inline: clamp(1.5rem, 5vw, 3rem);
		background: var(--color-bg);
		text-align: center;
		overflow: hidden;
	}

	.hero-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(1rem, 2vw, 1.5rem);
		max-width: var(--container-max);
		width: 100%;
	}

	/* Name heading */
	.hero-name {
		font-family: var(--font-display);
		font-size: clamp(3rem, 10vw, 5.5rem);
		font-weight: 800;
		font-style: italic;
		color: var(--color-text);
		line-height: 1.05;
		letter-spacing: -0.02em;
		margin: 0;
		/* Prevent layout shift when letters translate */
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
	}

	/* Each animated letter */
	.letter {
		display: inline-block;
		will-change: transform;
		transition: transform 0.12s ease-out;
	}

	.letter-space {
		display: inline-block;
		width: 0.35em;
	}

	/* Tagline */
	.hero-tagline {
		font-family: var(--font-sans);
		font-size: clamp(1rem, 2.5vw, 1.375rem);
		color: var(--color-text-muted);
		max-width: 44ch;
		line-height: 1.6;
		margin: 0;
	}

	/* CTA group */
	.hero-cta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		justify-content: center;
	}

	/* .btn / .btn-primary / .btn-secondary defined globally in styles/components.css */

	/* Scroll cue sits in normal flow ~24-32px below the CTA row, not glued to
	 * the viewport bottom, so the hero stays compact. */
	.scroll-cue {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		margin-top: clamp(1.5rem, 3vw, 2rem);
		color: var(--color-text-muted);
		opacity: 0.5;
		animation: scroll-bounce 2s ease-in-out infinite;
	}

	.scroll-label {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.scroll-arrow {
		display: block;
	}

	@keyframes scroll-bounce {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(5px);
		}
	}

	/* Reduced-motion: disable the scroll cue animation */
	@media (prefers-reduced-motion: reduce) {
		.scroll-cue {
			animation: none;
		}

		.letter {
			transition: none;
			will-change: auto;
		}
	}

	/* Mobile: slightly tighter vertical padding */
	@media (max-width: 480px) {
		.hero-cta {
			flex-direction: column;
			align-items: stretch;
		}

		.btn {
			text-align: center;
		}
	}
</style>
