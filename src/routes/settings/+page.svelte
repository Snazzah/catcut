<script lang="ts">
	import { resolve } from '$app/paths';
	import PageContent from '#lib/components/PageContent.svelte';
	import SwitchField from '#lib/components/common/SwitchField.svelte';
	import { resetSettings, settings } from '#lib/util/settings.svelte.js';
</script>

<svelte:head>
	<title>Settings - catcut</title>
	<link href="https://catcut.snaz.in/settings" rel="canonical" />
</svelte:head>

<PageContent>
	<h1 class="text-2xl font-bold text-white mb-3">Settings</h1>

	<div class="flex flex-col gap-4">
		<SwitchField title="Plausible Analytics" bind:checked={settings.analytics}>
			{#snippet description()}
				This uses <a href="https://plausible.io/privacy-focused-web-analytics" target="_blank" class="text-violet-400 hover:underline">Plausible</a> to gather anonymized analytics. Learn more in the <a
					href={resolve('/privacy')}
					class="text-violet-400 hover:underline">privacy policy</a
				>.
			{/snippet}
		</SwitchField>
	</div>

	<section class="mt-8 flex items-center justify-center text-sm gap-6 flex-wrap">
		<button class="text-violet-400 hover:underline cursor-pointer" onclick={() => resetSettings()}>Reset settings to default</button>
		<a href={resolve('/codecs')} class="text-violet-400 hover:underline">Supported codecs</a>
	</section>
</PageContent>
