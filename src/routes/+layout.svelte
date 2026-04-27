<script lang="ts">
	import '../app.css';
	import TopBar from '$lib/components/TopBar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { initLenis } from '$lib/utils/lenis';

	let { children } = $props();

	$effect(() => {
		const destroy = initLenis();
		return () => {
			destroy();
		};
	});
</script>

<a href="#main" class="skip-link">Skip to main content</a>

<TopBar />

<main id="main">
	{@render children()}
</main>

<Footer />
