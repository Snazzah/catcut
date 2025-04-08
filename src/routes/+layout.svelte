<script lang="ts">
	import '@fontsource-variable/inter';
	import '@fontsource-variable/source-code-pro';
	import '../app.css';
	import { PUBLIC_PLAUSIBLE_HOSTNAME } from '$env/static/public';
</script>

<svelte:head>
	<script src="/lib/jsmediatags.min.js"></script>
	{#if PUBLIC_PLAUSIBLE_HOSTNAME}
		<script
			data-domain={location.hostname}
			src="https://{PUBLIC_PLAUSIBLE_HOSTNAME}/js/script.pageview-props.tagged-events.js"
		></script>
	{/if}
</svelte:head>

<slot />
