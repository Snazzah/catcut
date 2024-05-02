<script lang="ts">
	import Icon from '@iconify/svelte';
	import { catcut } from '$lib/icons';
	import { PUBLIC_PLAUSIBLE_HOSTNAME } from '$env/static/public';
</script>

<svelte:head>
	<title>Privacy Policy - catcut</title>
	<link href="https://catcut.snaz.in/privacy" rel="canonical">
</svelte:head>

<main class="flex flex-col items-center justify-center min-h-screen">
	<div class="w-full max-w-md p-4">
		<Icon icon={catcut} class="w-16 h-16" />
		<h1 class="text-3xl font-bold text-white mb-4">Privacy Policy</h1>
		<p>
			catcut <b>does not send or store any of your media used in the app to a server</b>, all processing is done in the browser.
		</p>
		<br />
		<p>
			use of any third-party service (like dropbox, google drive, etc.) will only be used to
			retrieve the media in browser, and authorization data for some services may be stored within the browser.
			authorization data is only used for some services that require storing them in order to download files from that service.
			authorization data is never sent to any third-party can be cleared from settings.
		</p>
		{#if PUBLIC_PLAUSIBLE_HOSTNAME}
			<br />
			<p>
				this site uses a self-hosted instance of <a href="https://plausible.io">plausible</a>
				for web analytics, which does not use cookies and is fully compliant with GDPR, CCPA and PECR.
				all data is anonymous and used to gauge traffic, and does not send any information about your
				media being used. usage of analytics can be opted out of via settings.
			</p>
		{/if}
		<br />
		<a href="/" class="transition-all text-violet-500 hover:text-violet-400">
			&lt;- start using catcut
		</a>
	</div>
</main>

<style lang="scss">
	b {
		@apply text-neutral-200;
	}
	a[href^="http"] {
		@apply text-violet-300 transition-colors;
		&:hover {
			@apply text-violet-400;
		}
	}
</style>
