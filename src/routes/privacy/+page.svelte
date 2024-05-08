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
			use of any third-party service (like Dropbox, Google Drive, etc.) will only be used to retrieve the requested file by the user to be downloaded into webapp from the browser.
			when authenticating with Google, an access token is retrieved and is used to download requested files (via Google File Picker) from that service.
			authorization data and access tokens are stored in the browser (using local storage) and is never sent to any third-party server.
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
