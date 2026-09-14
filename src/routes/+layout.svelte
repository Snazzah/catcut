<script lang="ts">
	import { env } from '$env/dynamic/public';
	import '../app.css';
	import type { Snippet } from 'svelte';
  import { Tooltip } from "bits-ui";

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
	class="min-h-screen min-w-80 bg-neutral-950 font-sans text-neutral-400 scheme-dark"
>
	<Tooltip.Provider>
		{@render children()}
	</Tooltip.Provider>
</div>
