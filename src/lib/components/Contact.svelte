<section id="contact" aria-label="Contact">
	<div class="inner">
		<h2 class="heading">Get in touch</h2>

		<p class="invite">
			I'm open to grad and internship opportunities, especially in tech, digital, and data roles.
		</p>

		<ul class="links" role="list">
			<li>
				<a href="mailto:nickwfraser@gmail.com" class="link">
					<svg
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.75"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<rect x="2" y="4" width="20" height="16" rx="2" />
						<polyline points="2,4 12,13 22,4" />
					</svg>
					<span>nickwfraser@gmail.com</span>
				</a>
			</li>

			<li>
				<a
					href="https://github.com/nfras4"
					class="link"
					target="_blank"
					rel="noopener noreferrer"
				>
					<svg
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.75"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path
							d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
						/>
					</svg>
					<span>github.com/nfras4</span>
				</a>
			</li>

			<li>
				<a
					href="https://linkedin.com/in/nicholas-fraser-547348305"
					class="link"
					target="_blank"
					rel="noopener noreferrer"
				>
					<svg
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.75"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
						<rect x="2" y="9" width="4" height="12" />
						<circle cx="4" cy="4" r="2" />
					</svg>
					<span>linkedin.com/in/nicholas-fraser</span>
				</a>
			</li>

			<li>
				<a href="/cv.pdf" class="link link--cv" download>
					<svg
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.75"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="7,10 12,15 17,10" />
						<line x1="12" y1="15" x2="12" y2="3" />
					</svg>
					<span>Download CV</span>
				</a>
			</li>
		</ul>
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

	.heading {
		font-family: var(--font-display);
		font-size: var(--text-3xl);
		font-weight: 700;
		color: var(--color-text);
		margin: 0 0 var(--space-5) 0;
		line-height: 1.15;
	}

	.invite {
		font-family: var(--font-sans);
		font-size: var(--text-base);
		line-height: 1.75;
		color: var(--color-text-muted);
		margin: 0 0 var(--space-6) 0;
		max-width: 52ch;
	}

	.links {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-3);
	}

	.link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-3);
		font-family: var(--font-sans);
		font-size: var(--text-base);
		color: var(--color-text-muted);
		text-decoration: none;
		transition: color 0.15s ease-out;
	}

	.link:hover {
		color: var(--color-accent);
	}

	.link svg {
		flex-shrink: 0;
		color: var(--color-text-muted);
		transition: color 0.15s ease-out;
	}

	.link:hover svg {
		color: var(--color-accent);
	}

	.link--cv {
		color: var(--color-accent);
	}

	.link--cv svg {
		color: var(--color-accent);
	}

	.link--cv:hover {
		color: var(--color-text);
	}

	.link--cv:hover svg {
		color: var(--color-text);
	}

	@media (min-width: 768px) {
		.links {
			grid-template-columns: repeat(2, auto);
			justify-content: start;
			gap: var(--space-4) var(--space-8);
		}
	}
</style>
