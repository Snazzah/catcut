<script lang="ts">
	import { env } from '$env/dynamic/public';
	import '../app.css';
	import { onMount, type Snippet } from 'svelte';
	import { Tooltip } from 'bits-ui';
	import { isDiscordActivity, initDiscordActivity } from '$lib/discord';

	let { children }: { children: Snippet } = $props();

	onMount(() => {
		if (isDiscordActivity()) {
			initDiscordActivity().catch((err) => console.error('Discord activity init failed', err));
		}
	});
</script>

<svelte:head>
	{#if env.PUBLIC_PLAUSIBLE_HOSTNAME}
		<script
			data-domain="catcut.snaz.in"
			src="https://{env.PUBLIC_PLAUSIBLE_HOSTNAME}/js/script.pageview-props.tagged-events.js"
		></script>
	{/if}
</svelte:head>

<div class="min-h-svh min-w-80 font-sans text-neutral-400 scheme-dark">
	<div
		class="fixed top-0 right-0 left-0 -z-1 h-svh bg-linear-to-b from-transparent via-violet-300/2 to-violet-500/5"
	></div>
	<Tooltip.Provider>
		{@render children()}
	</Tooltip.Provider>
</div>
