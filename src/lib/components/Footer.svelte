<script lang="ts">
	const year = new Date().getFullYear();
</script>

<footer>
	<div class="inner">
		<p class="copy">&copy; {year} Nicholas Fraser. Built in Brisbane.</p>
		<ul class="socials" aria-label="Social links">
			<li>
				<a
					href="https://github.com/nfras4"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="GitHub"
				>
					<svg
						aria-hidden="true"
						focusable="false"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="currentColor"
					>
						<path
							d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18.91-.25 1.89-.38 2.86-.38.97 0 1.95.13 2.86.38 2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"
						/>
					</svg>
				</a>
			</li>
			<li>
				<a
					href="https://linkedin.com/in/nicholas-fraser-547348305"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="LinkedIn"
				>
					<svg
						aria-hidden="true"
						focusable="false"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="currentColor"
					>
						<path
							d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45C23.2 24 24 23.23 24 22.28V1.72C24 .77 23.2 0 22.22 0z"
						/>
					</svg>
				</a>
			</li>
		</ul>
	</div>
</footer>

<style>
	footer {
		border-top: 1px solid var(--color-border);
		margin-top: var(--space-9);
	}

	.inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-5);
		max-width: var(--container-max);
		margin: 0 auto;
		padding: var(--space-6) var(--container-pad);
	}

	.copy {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		margin: 0;
	}

	.socials {
		display: flex;
		gap: var(--space-4);
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.socials a {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: var(--radius-pill);
		color: var(--color-text-muted);
		transition: color 0.15s ease-out, background 0.15s ease-out;
	}

	.socials a:hover {
		color: var(--color-text);
		background: var(--color-surface);
	}
</style>
