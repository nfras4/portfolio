<script lang="ts">
	const links = [
		{ href: '#about', label: 'About' },
		{ href: '#arcade', label: 'Arcade' },
		{ href: '#gocard', label: 'GoCard' },
		{ href: '#tek-monkeys', label: 'Tek Monkeys' },
		{ href: '#contact', label: 'Contact' }
	];

	// Section ids whose visibility drives the active nav state. `#hero` is
	// included so that scrolling near the top of the page does not leave a
	// stale active link, even though there is no hero entry in `links`.
	const SECTION_IDS = ['hero', 'about', 'arcade', 'gocard', 'tek-monkeys', 'contact'] as const;

	let activeId = $state<string | null>(null);

	$effect(() => {
		if (typeof window === 'undefined') return;

		const sections = SECTION_IDS
			.map((id) => document.getElementById(id))
			.filter((el): el is HTMLElement => el !== null);

		if (sections.length === 0) return;

		// Track each section's intersection ratio so we can pick the one that
		// fills the most of the viewport. rootMargin trims 40% off the top and
		// bottom: a section is "active" once it dominates the centre band.
		const ratios = new Map<string, number>();

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
				}

				let bestId: string | null = null;
				let bestRatio = 0;
				for (const [id, ratio] of ratios) {
					if (ratio > bestRatio) {
						bestRatio = ratio;
						bestId = id;
					}
				}
				activeId = bestId;
			},
			{
				rootMargin: '-40% 0px -40% 0px',
				threshold: [0, 0.25, 0.5, 0.75, 1]
			}
		);

		sections.forEach((section) => observer.observe(section));

		return () => {
			observer.disconnect();
		};
	});
</script>

<header class="top-bar">
	<nav aria-label="Primary">
		<a href="#main" class="brand">Nick Fraser</a>
		<ul>
			{#each links as link (link.href)}
				{@const isActive = activeId !== null && `#${activeId}` === link.href}
				<li>
					<a
						href={link.href}
						class:is-active={isActive}
						aria-current={isActive ? 'page' : undefined}
					>
						{link.label}
					</a>
				</li>
			{/each}
			<li>
				<a href="/cv.pdf" class="resume" download>Resume</a>
			</li>
		</ul>
	</nav>
</header>

<style>
	.top-bar {
		position: sticky;
		top: 0;
		z-index: 50;
		background: color-mix(in oklab, var(--color-bg) 88%, transparent);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--color-border);
	}

	nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-5);
		max-width: var(--container-max);
		margin: 0 auto;
		padding: var(--space-3) var(--container-pad);
	}

	.brand {
		font-family: var(--font-display);
		font-style: italic;
		font-size: var(--text-lg);
		color: var(--color-text);
		text-decoration: none;
	}

	ul {
		display: flex;
		align-items: center;
		gap: var(--space-5);
		list-style: none;
		margin: 0;
		padding: 0;
		font-family: var(--font-mono);
		font-size: var(--text-sm);
	}

	li a {
		color: var(--color-text-muted);
		text-decoration: none;
		transition: color 0.15s ease-out;
	}

	li a:hover {
		color: var(--color-text);
	}

	li a.is-active {
		color: var(--color-accent);
	}

	.resume {
		color: var(--color-accent);
	}

	.resume:hover {
		color: var(--color-focus);
	}

	@media (max-width: 640px) {
		ul {
			gap: var(--space-3);
			font-size: var(--text-xs);
		}
		ul li:nth-child(3),
		ul li:nth-child(4) {
			display: none;
		}
	}
</style>
