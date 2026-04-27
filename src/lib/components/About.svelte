<section id="about" aria-label="About">
	<div class="inner">
		<div class="content">
			<h2 class="heading">About</h2>

			<div class="bio">
				<p>
					I'm a penultimate-year Finance Honours student at the University of Queensland, and the
					founder of Tek Monkeys, a Brisbane IT and compliance consultancy serving a private medical
					practice. I ship production TypeScript on Cloudflare's edge infrastructure.
				</p>
				<p>
					I work across commercial finance and hands-on technical delivery in a regulated
					environment, with day-to-day exposure to Privacy Act 1988, Australian Privacy Principles,
					and My Health Records Act 2012 obligations. The portfolio below is what I've built when I
					had the room to build whatever I wanted.
				</p>
			</div>

			<div class="stack-block">
				<h3 class="stack-heading">What I work with</h3>
				<ul class="badges" role="list">
					<li class="badge">TypeScript</li>
					<li class="badge">SvelteKit</li>
					<li class="badge">Cloudflare Workers</li>
					<li class="badge">Durable Objects</li>
					<li class="badge">Bun</li>
					<li class="badge">Python</li>
					<li class="badge">SQL</li>
					<li class="badge">R</li>
					<li class="badge">LLM APIs (OpenAI, Anthropic)</li>
					<li class="badge">Web Audio API</li>
				</ul>
			</div>

			<p class="currently">
				Penultimate year, scoping an AI-assisted billing verification tool at Tek Monkeys.
			</p>
		</div>

		<div class="photo-slot" aria-hidden="true">
			<span class="photo-placeholder">NF</span>
		</div>
	</div>
</section>

<style>
	section {
		padding-block: clamp(4rem, 8vw, 7rem);
		padding-inline: clamp(1.5rem, 5vw, 3rem);
	}

	.inner {
		display: flex;
		align-items: flex-start;
		gap: var(--space-7);
		max-width: var(--container-max);
		margin: 0 auto;
	}

	.content {
		flex: 1;
		min-width: 0;
	}

	.heading {
		font-family: var(--font-display);
		font-size: var(--text-3xl);
		font-weight: 700;
		color: var(--color-text);
		margin: 0 0 var(--space-5) 0;
		line-height: 1.15;
	}

	.bio {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-bottom: var(--space-6);
	}

	.bio p {
		font-family: var(--font-sans);
		font-size: var(--text-base);
		line-height: 1.75;
		color: var(--color-text);
		margin: 0;
		max-width: 60ch;
	}

	.stack-block {
		margin-bottom: var(--space-5);
	}

	.stack-heading {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-text-muted);
		margin: 0 0 var(--space-3) 0;
	}

	.badges {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.badge {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: var(--space-1) var(--space-3);
		line-height: 1.6;
		white-space: nowrap;
		transition: color 0.15s ease-out, border-color 0.15s ease-out;
	}

	.badge:hover {
		color: var(--color-text);
		border-color: rgba(255, 255, 255, 0.18);
	}

	.currently {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		margin: 0;
		padding-top: var(--space-4);
		border-top: 1px solid var(--color-border);
		max-width: 52ch;
	}

	/* Photo slot */
	.photo-slot {
		flex-shrink: 0;
		width: 10rem;
		height: 10rem;
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.photo-placeholder {
		font-family: var(--font-mono);
		font-size: var(--text-xl);
		font-weight: 600;
		color: var(--color-text-muted);
		user-select: none;
	}

	/* Responsive: stack vertically on narrow viewports */
	@media (max-width: 640px) {
		.inner {
			flex-direction: column-reverse;
		}

		.photo-slot {
			width: 6rem;
			height: 6rem;
		}

		.photo-placeholder {
			font-size: var(--text-base);
		}
	}
</style>
