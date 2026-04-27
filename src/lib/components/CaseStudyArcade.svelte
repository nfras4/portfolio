<script lang="ts">
	/**
	 * CaseStudyArcade - simple vertical case study for Monkey Barrel.
	 *
	 * Each panel fades in and translates up ~16px as it enters the viewport.
	 * No pin, no scrub, no horizontal scroll. The pinned cinematic timeline
	 * was removed in the polish pass to reduce dead space and avoid the
	 * scroll-jacking feel.
	 *
	 * Reduced-motion users get the panels at their final state with no
	 * animation. Lifecycle is contained inside a single `$effect` because
	 * Svelte 5's `onMount`/`onDestroy` are tree-shaken in production runes
	 * mode.
	 */
	import { revealOnScroll } from '$lib/utils/gsap';

	let sectionEl: HTMLElement | undefined = $state();

	const PANELS = [
		'panel-title',
		'panel-problem',
		'panel-stack',
		'panel-visual',
		'panel-metrics',
		'panel-mini'
	] as const;

	const TECH_STACK = [
		'SvelteKit 5 (runes)',
		'Cloudflare Workers',
		'Durable Objects',
		'D1',
		'Web Crypto API',
		'Bun'
	];

	const GAMES = [
		'Impostor',
		'Wavelength',
		'Poker',
		'Snap',
		'Chase the Queen',
		'President',
		'Connect Four'
	];

	$effect(() => {
		if (!sectionEl) return;

		const panels = Array.from(
			sectionEl.querySelectorAll<HTMLElement>('[data-arcade-panel]')
		);

		const cleanup = revealOnScroll(panels);

		return cleanup;
	});
</script>

<section
	id="arcade"
	aria-label="Arcade case study"
	bind:this={sectionEl}
	class="arcade"
>
	<div class="track">
		<header class="section-eyebrow">
			<span class="eyebrow-mono">Case study 01</span>
			<h2 class="section-title">Arcade <span class="title-aside">(Monkey Barrel)</span></h2>
		</header>

		<div class="panels">
			<!-- Panel 1: Title + subtitle -->
			<article data-arcade-panel id={PANELS[0]} class="panel panel-title">
				<p class="panel-kicker">2025 to Present</p>
				<h3 class="panel-headline">Real-time multiplayer arcade platform</h3>
				<p class="panel-lede">
					Seven party games sharing one chip economy, one identity layer, and one Durable Object
					per room. Built solo, deployed on Cloudflare's edge.
				</p>
			</article>

			<!-- Panel 2: Problem framing -->
			<article data-arcade-panel id={PANELS[1]} class="panel panel-problem">
				<p class="panel-kicker">The premise</p>
				<blockquote class="panel-quote">
					Wanted to play card games with my friends, ended up building a platform.
				</blockquote>
				<p class="panel-body">
					What started as a single Impostor knock-off turned into a shared chip economy, an XP
					progression system, and a ~6,400 line idle RPG sub-game called Wolton Dungeon. Same
					player, same wallet, seven different rooms.
				</p>
			</article>

			<!-- Panel 3: Tech stack -->
			<article data-arcade-panel id={PANELS[2]} class="panel panel-stack">
				<p class="panel-kicker">Stack</p>
				<h3 class="panel-headline panel-headline-sm">Edge-native, runes-first</h3>
				<ul class="stack-grid" aria-label="Technology stack">
					{#each TECH_STACK as tech (tech)}
						<li class="stack-badge">{tech}</li>
					{/each}
				</ul>
				<p class="panel-body">
					Each game room is a single Durable Object holding the canonical state. Workers route
					WebSocket connections, D1 stores the persistent chip ledger, and Web Crypto handles
					session signing without third-party auth.
				</p>
			</article>

			<!-- Panel 4: Visual placeholder -->
			<article data-arcade-panel id={PANELS[3]} class="panel panel-visual">
				<p class="panel-kicker">Live product</p>
				<figure class="hero-figure">
					<div class="browser-frame" role="img" aria-label="Arcade card table interface showing a poker hand with five players seated around a green felt table">
						<div class="browser-bar">
							<span class="dot dot-r" aria-hidden="true"></span>
							<span class="dot dot-y" aria-hidden="true"></span>
							<span class="dot dot-g" aria-hidden="true"></span>
							<span class="browser-url">arcade.nickwfraser.dev</span>
						</div>
						<div class="browser-body">
							<svg
								viewBox="0 0 640 360"
								preserveAspectRatio="xMidYMid slice"
								aria-hidden="true"
								focusable="false"
								class="table-svg"
							>
								<defs>
									<radialGradient id="felt" cx="50%" cy="50%" r="60%">
										<stop offset="0%" stop-color="#1f5d3a" />
										<stop offset="100%" stop-color="#0c2c1c" />
									</radialGradient>
									<linearGradient id="card" x1="0" x2="0" y1="0" y2="1">
										<stop offset="0%" stop-color="#fbfaf6" />
										<stop offset="100%" stop-color="#d9d6cb" />
									</linearGradient>
								</defs>
								<rect width="640" height="360" fill="#0b0b0e" />
								<ellipse cx="320" cy="180" rx="240" ry="120" fill="url(#felt)" stroke="#7a5a2a" stroke-width="3" />
								<!-- Player avatars around the table -->
								<g>
									<circle cx="320" cy="60" r="18" fill="#1c1c24" stroke="#e9a23b" stroke-width="2" />
									<circle cx="120" cy="180" r="18" fill="#1c1c24" stroke="#e9a23b" stroke-width="2" />
									<circle cx="520" cy="180" r="18" fill="#1c1c24" stroke="#e9a23b" stroke-width="2" />
									<circle cx="220" cy="310" r="18" fill="#1c1c24" stroke="#e9a23b" stroke-width="2" />
									<circle cx="420" cy="310" r="18" fill="#1c1c24" stroke="#e9a23b" stroke-width="2" />
								</g>
								<!-- Community cards in centre -->
								<g transform="translate(220 150)">
									<rect x="0" y="0" width="36" height="52" rx="4" fill="url(#card)" />
									<text x="6" y="18" font-family="serif" font-size="14" fill="#c7282a" font-weight="700">A</text>
									<text x="6" y="44" font-family="serif" font-size="16" fill="#c7282a">&#9829;</text>
								</g>
								<g transform="translate(262 150)">
									<rect x="0" y="0" width="36" height="52" rx="4" fill="url(#card)" />
									<text x="6" y="18" font-family="serif" font-size="14" fill="#1a1a1a" font-weight="700">K</text>
									<text x="6" y="44" font-family="serif" font-size="16" fill="#1a1a1a">&#9824;</text>
								</g>
								<g transform="translate(304 150)">
									<rect x="0" y="0" width="36" height="52" rx="4" fill="url(#card)" />
									<text x="6" y="18" font-family="serif" font-size="14" fill="#c7282a" font-weight="700">Q</text>
									<text x="6" y="44" font-family="serif" font-size="16" fill="#c7282a">&#9830;</text>
								</g>
								<g transform="translate(346 150)">
									<rect x="0" y="0" width="36" height="52" rx="4" fill="url(#card)" />
									<text x="6" y="18" font-family="serif" font-size="14" fill="#1a1a1a" font-weight="700">10</text>
									<text x="6" y="44" font-family="serif" font-size="16" fill="#1a1a1a">&#9827;</text>
								</g>
								<g transform="translate(388 150)">
									<rect x="0" y="0" width="36" height="52" rx="4" fill="url(#card)" />
									<text x="6" y="18" font-family="serif" font-size="14" fill="#c7282a" font-weight="700">J</text>
									<text x="6" y="44" font-family="serif" font-size="16" fill="#c7282a">&#9829;</text>
								</g>
								<!-- Chip stacks -->
								<g>
									<circle cx="290" cy="230" r="9" fill="#e9a23b" stroke="#7a5a2a" stroke-width="1.5" />
									<circle cx="305" cy="232" r="9" fill="#c7282a" stroke="#7a5a2a" stroke-width="1.5" />
									<circle cx="320" cy="234" r="9" fill="#1c1c24" stroke="#e9a23b" stroke-width="1.5" />
									<circle cx="335" cy="232" r="9" fill="#e9a23b" stroke="#7a5a2a" stroke-width="1.5" />
									<circle cx="350" cy="230" r="9" fill="#c7282a" stroke="#7a5a2a" stroke-width="1.5" />
								</g>
								<!-- HUD label top-left -->
								<g>
									<rect x="16" y="16" width="120" height="22" rx="11" fill="#1c1c24" stroke="#e9a23b" stroke-width="1" opacity="0.9" />
									<text x="28" y="31" font-family="monospace" font-size="11" fill="#f4f3f0">POT 1,420 chips</text>
								</g>
							</svg>
						</div>
					</div>
					<figcaption class="figure-caption">
						Poker room mid-hand. The pot, hand state, and turn order all live on the room's
						Durable Object and stream to clients via WebSocket.
					</figcaption>
				</figure>
			</article>

			<!-- Panel 5: Metrics -->
			<article data-arcade-panel id={PANELS[4]} class="panel panel-metrics">
				<p class="panel-kicker">By the numbers</p>
				<dl class="metrics">
					<div class="metric">
						<dt>Games shipped</dt>
						<dd><span class="metric-num">7+</span></dd>
						<p class="metric-note">{GAMES.join(', ')}</p>
					</div>
					<div class="metric">
						<dt>Multiplayer transport</dt>
						<dd><span class="metric-num">WS</span></dd>
						<p class="metric-note">Real-time WebSocket fan-out per Durable Object room</p>
					</div>
					<div class="metric">
						<dt>Wolton Dungeon</dt>
						<dd><span class="metric-num">~6,400</span></dd>
						<p class="metric-note">Lines of code in the idle RPG sub-game</p>
					</div>
				</dl>
			</article>

			<!-- Panel 6: Embedded mini-game placeholder -->
			<!-- MINI-GAME-SLOT: post-MVP -->
			<article data-arcade-panel id={PANELS[5]} class="panel panel-mini">
				<p class="panel-kicker">Coming soon</p>
				<div data-arcade-mini-game-slot class="mini-slot" aria-label="Embedded mini-game slot, coming soon">
					<div class="mini-grid" aria-hidden="true">
						{#each Array(12) as _, i (i)}
							<span class="mini-tile"></span>
						{/each}
					</div>
					<div class="mini-overlay">
						<span class="mini-tag">mini-game</span>
						<p class="mini-text">A playable Arcade demo will live here.</p>
					</div>
				</div>
			</article>
		</div>

		<!-- CTA row -->
		<nav data-arcade-panel class="cta-row" aria-label="Arcade case study links">
			<a
				class="btn btn-primary"
				href="https://arcade.nickwfraser.dev"
				target="_blank"
				rel="noopener noreferrer"
			>
				Visit the live site
			</a>
			<a
				class="btn btn-secondary"
				href="https://github.com/nfras4/impostor"
				target="_blank"
				rel="noopener noreferrer"
			>
				GitHub
			</a>
		</nav>
	</div>
</section>

<style>
	.arcade {
		position: relative;
		background: var(--color-bg);
		color: var(--color-text);
		padding-block: clamp(4rem, 8vw, 7rem);
		padding-inline: clamp(1.5rem, 5vw, 3rem);
	}

	.track {
		max-width: var(--container-max);
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: clamp(2rem, 5vw, 4rem);
	}

	.section-eyebrow {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.eyebrow-mono {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-accent);
	}

	.section-title {
		font-family: var(--font-display);
		font-size: clamp(2rem, 5vw, var(--text-4xl));
		font-weight: 700;
		font-style: italic;
		line-height: 1.05;
		letter-spacing: -0.02em;
		margin: 0;
	}

	.title-aside {
		font-family: var(--font-sans);
		font-style: normal;
		font-weight: 400;
		font-size: 0.55em;
		color: var(--color-text-muted);
		letter-spacing: 0;
		margin-left: var(--space-2);
		vertical-align: middle;
	}

	/* Vertical content column. Each panel is a self-contained block that
	 * fades into view as the user scrolls. */
	.panels {
		display: flex;
		flex-direction: column;
		gap: clamp(2rem, 5vw, 4rem);
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-5);
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		border-radius: var(--radius-lg);
	}

	.panel-kicker {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0;
	}

	.panel-headline {
		font-family: var(--font-display);
		font-size: clamp(1.5rem, 3.5vw, var(--text-3xl));
		font-weight: 700;
		line-height: 1.15;
		letter-spacing: -0.015em;
		margin: 0;
		color: var(--color-text);
	}

	.panel-headline-sm {
		font-size: clamp(1.25rem, 2.5vw, var(--text-2xl));
	}

	.panel-lede {
		font-family: var(--font-sans);
		font-size: var(--text-lg);
		line-height: 1.55;
		max-width: 56ch;
		color: var(--color-text);
		margin: 0;
	}

	.panel-body {
		font-family: var(--font-sans);
		font-size: var(--text-base);
		line-height: 1.65;
		max-width: 60ch;
		color: var(--color-text-muted);
		margin: 0;
	}

	.panel-quote {
		font-family: var(--font-display);
		font-style: italic;
		font-size: clamp(1.5rem, 3.2vw, var(--text-3xl));
		line-height: 1.2;
		color: var(--color-text);
		margin: 0;
		padding-left: var(--space-4);
		border-left: 2px solid var(--color-accent);
		max-width: 50ch;
	}

	/* Tech stack badges */
	.stack-grid {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.stack-badge {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.04em;
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-pill);
		background: var(--color-surface-2);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}

	/* Visual / browser frame */
	.hero-figure {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin: 0;
	}

	.browser-frame {
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border);
		background: var(--color-surface-2);
		overflow: hidden;
		box-shadow:
			0 0 0 1px rgba(255, 255, 255, 0.02),
			0 30px 60px -20px rgba(0, 0, 0, 0.6);
	}

	.browser-bar {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		display: inline-block;
	}
	.dot-r { background: #ff5f57; }
	.dot-y { background: #febc2e; }
	.dot-g { background: #28c840; }

	.browser-url {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		margin-left: var(--space-3);
	}

	.browser-body {
		aspect-ratio: 16 / 9;
		background: #0b0b0e;
	}

	.table-svg {
		display: block;
		width: 100%;
		height: 100%;
	}

	.figure-caption {
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		max-width: 60ch;
	}

	/* Metrics */
	.metrics {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: var(--space-5);
		margin: 0;
	}

	.metric {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface-2);
	}

	.metric dt {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}

	.metric dd {
		margin: 0;
	}

	.metric-num {
		font-family: var(--font-display);
		font-size: var(--text-4xl);
		font-weight: 700;
		font-style: italic;
		color: var(--color-accent);
		line-height: 1;
	}

	.metric-note {
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		line-height: 1.5;
		margin: 0;
	}

	/* Mini-game placeholder */
	.mini-slot {
		position: relative;
		display: grid;
		place-items: center;
		min-height: 240px;
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface-2);
		overflow: hidden;
	}

	.mini-grid {
		position: absolute;
		inset: 0;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		grid-template-rows: repeat(3, 1fr);
		gap: 2px;
		opacity: 0.18;
	}

	.mini-tile {
		background: var(--color-accent);
	}

	.mini-tile:nth-child(odd) {
		background: var(--color-surface);
	}

	.mini-overlay {
		position: relative;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-5);
	}

	.mini-tag {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-accent);
	}

	.mini-text {
		font-family: var(--font-display);
		font-style: italic;
		font-size: var(--text-xl);
		color: var(--color-text);
		margin: 0;
	}

	/* CTA row */
	.cta-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
	}

	/* .btn / .btn-primary / .btn-secondary defined globally in styles/components.css */

	/* Mobile tightening */
	@media (max-width: 480px) {
		.metrics {
			grid-template-columns: 1fr;
		}

		.cta-row {
			flex-direction: column;
			align-items: stretch;
		}

		.btn {
			text-align: center;
		}
	}
</style>
