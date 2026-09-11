<script lang="ts">
	import { env } from '$env/dynamic/public';
	import '../app.css';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	{#if env.PUBLIC_PLAUSIBLE_HOSTNAME}
		<script
			data-domain="catcut.snaz.in"
			src="https://{env.PUBLIC_PLAUSIBLE_HOSTNAME}/js/script.pageview-props.tagged-events.js"
		></script>
	{/if}
</svelte:head>

<div
	class="min-h-screen min-w-80 bg-neutral-950 font-['Satoshi',system-ui,sans-serif] text-neutral-400 scheme-dark"
>
	{@render children()}
</div>
