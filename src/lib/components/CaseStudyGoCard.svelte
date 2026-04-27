<script lang="ts">
	/**
	 * GoCard Insights case study - simple vertical layout.
	 *
	 * Each panel fades in and translates up ~16px as it enters the viewport.
	 * The pinned horizontal-scroll cinematic timeline was removed in the
	 * polish pass so the page reads as a normal scrolling document.
	 *
	 * Reduced-motion users get the panels at their final state with no
	 * animation. Lifecycle is contained inside a single `$effect` because
	 * Svelte 5's `onMount`/`onDestroy` are tree-shaken in production runes
	 * mode.
	 */

	import { revealOnScroll } from '$lib/utils/gsap';

	let sectionEl = $state<HTMLElement | null>(null);

	$effect(() => {
		if (!sectionEl) {
			return;
		}

		const panelEls = Array.from(
			sectionEl.querySelectorAll<HTMLElement>('[data-panel]')
		);

		const cleanup = revealOnScroll(panelEls);

		return cleanup;
	});
</script>

<section
	id="gocard"
	aria-label="GoCard Insights case study"
	bind:this={sectionEl}
	class="case-study"
>
	<div class="track">
		<!-- Panel 1: title + subtitle -->
		<article class="panel panel-title" data-panel>
			<div class="panel-inner">
				<p class="eyebrow">Case study, 2025</p>
				<h2 class="title">GoCard Insights</h2>
				<p class="subtitle">Brisbane GoCard transit analytics</p>
			</div>
		</article>

		<!-- Panel 2: problem framing -->
		<article class="panel panel-problem" data-panel>
			<div class="panel-inner">
				<h3 class="kicker">Problem</h3>
				<p class="prose">
					Brisbane's public transport network produces a constant stream of GoCard tap data
					through TransLink. GoCard Insights is my BSAN4204 capstone project, a SvelteKit
					dashboard that turns that ridership data into something a transit planner or a
					curious commuter can actually read.
				</p>
				<p class="prose">
					The brief: explore patterns in tap-on and tap-off behaviour across stations,
					time of day, and route, and present them through interactive maps and charts that
					stay readable on a phone.
				</p>
			</div>
		</article>

		<!-- Panel 3: tech stack -->
		<article class="panel panel-stack" data-panel>
			<div class="panel-inner">
				<h3 class="kicker">Stack</h3>
				<dl class="stack-grid">
					<div class="stack-row">
						<dt>Frontend</dt>
						<dd>SvelteKit 5 (runes), TailwindCSS v4</dd>
					</div>
					<div class="stack-row">
						<dt>Runtime</dt>
						<dd>Bun</dd>
					</div>
					<div class="stack-row">
						<dt>Database</dt>
						<dd>bun:sqlite, Drizzle ORM</dd>
					</div>
					<div class="stack-row">
						<dt>Visualisation</dt>
						<dd>Chart.js, MapLibre GL JS</dd>
					</div>
					<div class="stack-row">
						<dt>Hosting</dt>
						<dd>Railway (Bun runtime; bun:sqlite needs Bun, not Vercel)</dd>
					</div>
				</dl>
			</div>
		</article>

		<!-- Panel 4: visual preview -->
		<article class="panel panel-visual" data-panel>
			<div class="panel-inner">
				<h3 class="kicker">Preview</h3>
				<div
					class="preview-frame"
					role="img"
					aria-label="GoCard Insights dashboard preview with a ridership chart on the left and a Brisbane station map with coloured station dots on the right."
				>
					<svg
						viewBox="0 0 800 460"
						xmlns="http://www.w3.org/2000/svg"
						class="preview-svg"
						aria-hidden="true"
						focusable="false"
					>
						<!-- Dashboard frame -->
						<rect
							x="0"
							y="0"
							width="800"
							height="460"
							rx="14"
							fill="#14141a"
							stroke="rgba(255,255,255,0.08)"
							stroke-width="1"
						/>

						<!-- Top bar -->
						<rect x="0" y="0" width="800" height="36" rx="14" fill="#1c1c24" />
						<rect x="0" y="22" width="800" height="14" fill="#1c1c24" />
						<circle cx="18" cy="18" r="4" fill="#3a3a44" />
						<circle cx="34" cy="18" r="4" fill="#3a3a44" />
						<circle cx="50" cy="18" r="4" fill="#3a3a44" />
						<rect x="80" y="13" width="120" height="10" rx="3" fill="#2a2a32" />

						<!-- Chart panel (left) -->
						<rect
							x="20"
							y="60"
							width="360"
							height="380"
							rx="10"
							fill="#0f0f14"
							stroke="rgba(255,255,255,0.06)"
						/>
						<rect x="36" y="78" width="140" height="10" rx="2" fill="#3a3a44" />
						<rect x="36" y="96" width="80" height="8" rx="2" fill="#23232b" />

						<!-- Chart axes -->
						<line
							x1="56"
							y1="140"
							x2="56"
							y2="400"
							stroke="rgba(255,255,255,0.12)"
							stroke-width="1"
						/>
						<line
							x1="56"
							y1="400"
							x2="360"
							y2="400"
							stroke="rgba(255,255,255,0.12)"
							stroke-width="1"
						/>

						<!-- Bars (ridership by hour) -->
						<rect x="74" y="340" width="18" height="60" fill="#2a2a32" />
						<rect x="100" y="300" width="18" height="100" fill="#2a2a32" />
						<rect x="126" y="220" width="18" height="180" fill="#e9a23b" />
						<rect x="152" y="240" width="18" height="160" fill="#2a2a32" />
						<rect x="178" y="280" width="18" height="120" fill="#2a2a32" />
						<rect x="204" y="200" width="18" height="200" fill="#e9a23b" />
						<rect x="230" y="170" width="18" height="230" fill="#e9a23b" />
						<rect x="256" y="260" width="18" height="140" fill="#2a2a32" />
						<rect x="282" y="290" width="18" height="110" fill="#2a2a32" />
						<rect x="308" y="320" width="18" height="80" fill="#2a2a32" />
						<rect x="334" y="350" width="18" height="50" fill="#2a2a32" />

						<!-- Trend line over bars -->
						<polyline
							points="83,360 109,310 135,230 161,250 187,290 213,210 239,180 265,270 291,300 317,330 343,360"
							fill="none"
							stroke="#f6c272"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<!-- Trend dots -->
						<g fill="#f6c272">
							<circle cx="83" cy="360" r="2.5" />
							<circle cx="109" cy="310" r="2.5" />
							<circle cx="135" cy="230" r="2.5" />
							<circle cx="161" cy="250" r="2.5" />
							<circle cx="187" cy="290" r="2.5" />
							<circle cx="213" cy="210" r="2.5" />
							<circle cx="239" cy="180" r="2.5" />
							<circle cx="265" cy="270" r="2.5" />
							<circle cx="291" cy="300" r="2.5" />
							<circle cx="317" cy="330" r="2.5" />
							<circle cx="343" cy="360" r="2.5" />
						</g>

						<!-- Map panel (right) -->
						<rect
							x="400"
							y="60"
							width="380"
							height="380"
							rx="10"
							fill="#0f0f14"
							stroke="rgba(255,255,255,0.06)"
						/>
						<rect x="416" y="78" width="120" height="10" rx="2" fill="#3a3a44" />

						<!-- Map "land" abstract shapes -->
						<path
							d="M 420 130 Q 500 110 570 140 T 770 160 L 770 420 L 420 420 Z"
							fill="#15151c"
							stroke="rgba(255,255,255,0.05)"
						/>
						<path
							d="M 420 200 Q 480 180 540 210 T 660 240 T 770 230"
							fill="none"
							stroke="rgba(255,255,255,0.08)"
							stroke-width="1"
						/>
						<path
							d="M 420 280 Q 500 270 570 290 T 770 310"
							fill="none"
							stroke="rgba(255,255,255,0.08)"
							stroke-width="1"
						/>

						<!-- River-like blue band -->
						<path
							d="M 420 350 Q 500 330 580 360 T 770 350 L 770 380 Q 680 400 580 380 T 420 380 Z"
							fill="rgba(80, 130, 200, 0.18)"
							stroke="rgba(120, 170, 230, 0.32)"
						/>

						<!-- Route lines -->
						<polyline
							points="460,180 510,210 560,230 610,260 660,280 720,300"
							fill="none"
							stroke="rgba(233, 162, 59, 0.55)"
							stroke-width="1.5"
							stroke-dasharray="4 3"
						/>
						<polyline
							points="450,400 490,360 540,330 600,300 660,280"
							fill="none"
							stroke="rgba(233, 162, 59, 0.35)"
							stroke-width="1.5"
							stroke-dasharray="4 3"
						/>

						<!-- Station dots (heatmap-style) -->
						<g>
							<circle cx="460" cy="180" r="6" fill="#e9a23b" />
							<circle cx="510" cy="210" r="5" fill="#e9a23b" opacity="0.85" />
							<circle cx="560" cy="230" r="8" fill="#f6c272" />
							<circle cx="610" cy="260" r="5" fill="#e9a23b" opacity="0.7" />
							<circle cx="660" cy="280" r="7" fill="#f6c272" />
							<circle cx="720" cy="300" r="4" fill="#e9a23b" opacity="0.6" />
							<circle cx="490" cy="360" r="5" fill="#e9a23b" opacity="0.7" />
							<circle cx="540" cy="330" r="6" fill="#e9a23b" />
							<circle cx="600" cy="300" r="9" fill="#f6c272" />
							<circle cx="450" cy="400" r="4" fill="#e9a23b" opacity="0.5" />
						</g>

						<!-- Faux legend -->
						<g font-family="ui-monospace, monospace" font-size="10" fill="#9b9aa1">
							<circle cx="426" cy="412" r="3" fill="#f6c272" />
							<text x="436" y="415">High traffic</text>
							<circle cx="510" cy="412" r="3" fill="#e9a23b" opacity="0.6" />
							<text x="520" y="415">Lower</text>
						</g>
					</svg>
				</div>
				<p class="caption">
					Ridership by hour-of-day with a station heatmap overlay across central Brisbane.
				</p>
			</div>
		</article>

		<!-- Panel 5: key features -->
		<article class="panel panel-features" data-panel>
			<div class="panel-inner">
				<h3 class="kicker">What it does</h3>
				<ul class="feature-list">
					<li>
						<span class="feature-tag">Map</span>
						<span class="feature-text">
							Interactive station map built on MapLibre GL JS, with tap-volume layered as
							station-level heatmap dots.
						</span>
					</li>
					<li>
						<span class="feature-tag">Heatmap</span>
						<span class="feature-text">
							Time-of-day heatmap surfacing morning and evening commuter peaks across the
							network.
						</span>
					</li>
					<li>
						<span class="feature-tag">Trends</span>
						<span class="feature-text">
							Ridership trend charts (Chart.js) by route, week, and direction with quick
							filter chips.
						</span>
					</li>
					<li>
						<span class="feature-tag">Schema</span>
						<span class="feature-text">
							Drizzle ORM with typed migrations against a bun:sqlite database, running on the
							Bun runtime end to end.
						</span>
					</li>
				</ul>
			</div>
		</article>

		<!-- Panel 6: CTA -->
		<article class="panel panel-cta" data-panel>
			<div class="panel-inner">
				<h3 class="kicker">Links</h3>
				<p class="prose">
					Live build deployed on Railway, source on GitHub. The repo includes the Drizzle
					schema, migrations, and the seeding scripts used during the capstone.
				</p>
				<div class="cta-row" role="group" aria-label="GoCard Insights links">
					<a
						class="btn btn-primary"
						href="https://gocard.nickwfraser.dev"
						target="_blank"
						rel="noopener noreferrer"
					>
						Visit the live site
					</a>
					<a
						class="btn btn-secondary"
						href="https://github.com/nfras4/gocard-insights"
						target="_blank"
						rel="noopener noreferrer"
					>
						GitHub
					</a>
				</div>
			</div>
		</article>
	</div>
</section>

<style>
	.case-study {
		position: relative;
		background: var(--color-bg);
		color: var(--color-text);
		padding-block: clamp(4rem, 8vw, 7rem);
		padding-inline: clamp(1.5rem, 5vw, 3rem);
	}

	/* Vertical content column. Each panel is a self-contained block that
	 * fades into view as the user scrolls. */
	.track {
		max-width: var(--container-max);
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: clamp(2rem, 5vw, 4rem);
	}

	.panel {
		display: block;
	}

	.panel-inner {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.eyebrow {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-text-muted);
		margin: 0;
	}

	.title {
		font-family: var(--font-display);
		font-size: clamp(2rem, 5vw, var(--text-4xl));
		font-weight: 800;
		font-style: italic;
		line-height: 1.05;
		letter-spacing: -0.02em;
		margin: 0;
		color: var(--color-text);
	}

	.subtitle {
		font-family: var(--font-sans);
		font-size: clamp(1rem, 2.2vw, 1.25rem);
		color: var(--color-text-muted);
		max-width: 44ch;
		line-height: 1.5;
		margin: 0;
	}

	.kicker {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0;
	}

	.prose {
		font-family: var(--font-sans);
		font-size: var(--text-base);
		line-height: 1.7;
		color: var(--color-text);
		margin: 0;
		max-width: 60ch;
	}

	/* Stack panel */
	.stack-grid {
		display: grid;
		grid-template-columns: minmax(8rem, 12rem) 1fr;
		gap: var(--space-3) var(--space-5);
		margin: 0;
		max-width: 56rem;
	}

	.stack-row {
		display: contents;
	}

	.stack-row dt {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-text-muted);
		padding-top: 0.15rem;
	}

	.stack-row dd {
		font-family: var(--font-sans);
		font-size: var(--text-base);
		color: var(--color-text);
		margin: 0;
		line-height: 1.6;
	}

	/* Visual panel */
	.preview-frame {
		width: 100%;
		max-width: 56rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-3);
		box-shadow: 0 30px 80px -40px rgba(0, 0, 0, 0.7);
	}

	.preview-svg {
		display: block;
		width: 100%;
		height: auto;
		border-radius: var(--radius-md);
	}

	.caption {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		margin: 0;
		max-width: 56rem;
	}

	/* Features panel */
	.feature-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		max-width: 56rem;
	}

	.feature-list li {
		display: grid;
		grid-template-columns: minmax(5.5rem, 7rem) 1fr;
		gap: var(--space-4);
		align-items: baseline;
		padding: var(--space-3) 0;
		border-top: 1px solid var(--color-border);
	}

	.feature-list li:first-child {
		border-top: none;
		padding-top: 0;
	}

	.feature-tag {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-accent);
	}

	.feature-text {
		font-family: var(--font-sans);
		font-size: var(--text-base);
		line-height: 1.65;
		color: var(--color-text);
	}

	/* CTA panel */
	.cta-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		margin-top: var(--space-2);
	}

	/* .btn / .btn-primary / .btn-secondary defined globally in styles/components.css */

	@media (max-width: 480px) {
		.cta-row {
			flex-direction: column;
			align-items: stretch;
		}

		.feature-list li {
			grid-template-columns: 1fr;
			gap: var(--space-2);
		}
	}
</style>
