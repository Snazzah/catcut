<script lang="ts">
	import { resolve } from '$app/paths';
	import PageContent from '#lib/components/PageContent.svelte';
	import SwitchField from '#lib/components/common/SwitchField.svelte';
	import { resetSettings, settings } from '#lib/util/settings.svelte.js';
	import { GOOGLE_TOKEN_KEY, googleAllowed } from '#lib/cloud-pickers.js';
	import { onMount } from 'svelte';

	let hasGoogleToken = $state(false);

	function checkGoogleToken() {
		hasGoogleToken = localStorage.getItem(GOOGLE_TOKEN_KEY) !== null;
	}

	function clearGoogleToken() {
		localStorage.removeItem(GOOGLE_TOKEN_KEY);
		checkGoogleToken();
	}

	onMount(checkGoogleToken);
</script>

<svelte:window onstorage={checkGoogleToken} />

<svelte:head>
	<title>Settings - catcut</title>
	<link href="https://catcut.snaz.in/settings" rel="canonical" />
</svelte:head>

<PageContent>
	<h1 class="text-2xl font-bold text-white mb-3">Settings</h1>

	<div class="flex flex-col gap-4">
		<SwitchField title="Start with the editor" bind:checked={settings.startWithEditor}>
			{#snippet description()}
				Automatically open the editor when selecting a file.
			{/snippet}
		</SwitchField>
		<SwitchField title="Plausible Analytics" bind:checked={settings.analytics}>
			{#snippet description()}
				This uses <a href="https://plausible.io/privacy-focused-web-analytics" target="_blank" class="text-violet-400 hover:underline">Plausible</a> to gather anonymized analytics. Learn more in the <a
					href={resolve('/privacy')}
					class="text-violet-400 hover:underline">privacy policy</a
				>.
			{/snippet}
		</SwitchField>
		{#if googleAllowed}
			<div class="flex items-center justify-between gap-4">
				<div class="flex flex-col gap-0.5">
					<span class="font-medium text-neutral-200">Clear Google Auth Data</span>
					<p class="text-sm text-neutral-400">
						{hasGoogleToken
							? 'Delete the saved Google sign-in token used by the Drive picker.'
							: 'There is no saved Google access token in catcut.'}
					</p>
				</div>
				<button
					class="shrink-0 cursor-pointer rounded-lg bg-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-200 transition-[background-color,scale] outline-none focus-visible:ring-2 focus-visible:ring-violet-200 enabled:hover:bg-neutral-600 enabled:active:scale-95 disabled:cursor-default disabled:opacity-50"
					disabled={!hasGoogleToken}
					onclick={clearGoogleToken}>Clear</button
				>
			</div>
		{/if}
	</div>

	<section class="mt-8 flex items-center justify-center text-sm gap-6 flex-wrap">
		<button class="text-violet-400 hover:underline cursor-pointer" onclick={() => resetSettings()}>Reset settings to default</button>
		<a href={resolve('/codecs')} class="text-violet-400 hover:underline">Supported codecs</a>
	</section>
</PageContent>
