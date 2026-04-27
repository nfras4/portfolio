<section id="tek-monkeys" aria-label="Tek Monkeys consultancy">
	<div class="inner">
		<p class="eyebrow">Founder &amp; IT Consultant</p>
		<h2 class="heading">Tek Monkeys</h2>

		<p class="body">
			Founded Tek Monkeys in 2024 to deliver IT, system administration, and compliance work for a
			Brisbane private medical practice. Daily operation aligns with Privacy Act 1988, Australian
			Privacy Principles, and My Health Records Act 2012. Currently scoping an AI-assisted billing
			verification tool for voice-dictated clinical billing, designed as compliance-aware assistive
			review with clinician sign-off aligned to Medicare Benefits Schedule requirements.
		</p>

		<h3 class="frameworks-heading">Compliance frameworks</h3>
		<ul class="frameworks" role="list">
			<li>Privacy Act 1988</li>
			<li>Australian Privacy Principles</li>
			<li>My Health Records Act 2012</li>
			<li>Health Insurance Act 1973 (Medicare billing)</li>
		</ul>

		<p class="note">No public site (private client).</p>
	</div>
</section>

<style>
	section {
		padding-block: clamp(4rem, 8vw, 7rem);
		padding-inline: clamp(1.5rem, 5vw, 3rem);
		border-top: 1px solid var(--color-border);
	}

	.inner {
		max-width: var(--container-max);
		margin: 0 auto;
	}

	.eyebrow {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0 0 var(--space-3) 0;
	}

	.heading {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		font-weight: 700;
		color: var(--color-text);
		margin: 0 0 var(--space-5) 0;
		line-height: 1.2;
	}

	.body {
		font-family: var(--font-sans);
		font-size: var(--text-base);
		line-height: 1.75;
		color: var(--color-text);
		margin: 0 0 var(--space-6) 0;
		max-width: 60ch;
	}

	.frameworks-heading {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-text-muted);
		margin: 0 0 var(--space-3) 0;
	}

	.frameworks {
		list-style: none;
		margin: 0 0 var(--space-5) 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.frameworks li {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		padding-left: var(--space-4);
		position: relative;
	}

	.frameworks li::before {
		content: '-';
		position: absolute;
		left: 0;
		color: var(--color-border);
	}

	.note {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		margin: 0;
		opacity: 0.7;
	}
</style>
