<script lang="ts">
	import dropboxIcon from '@iconify-icons/mdi/dropbox';
	import driveIcon from '@iconify-icons/mdi/google-drive';
	import PlayerButton from '#lib/components/common/PlayerButton.svelte';
	import { dropboxAllowed, googleAllowed, openCloudPicker } from '#lib/cloud-pickers.js';
	import { isDiscordActivity } from '#lib/discord/index.svelte.js';
	import type { RemoteMediaSource } from '#lib/store.svelte.js';

	let { onselect }: { onselect: (sources: RemoteMediaSource[]) => void } = $props();
</script>

{#if (googleAllowed || dropboxAllowed) && !isDiscordActivity()}
	<div class="flex items-center gap-2 text-sm">
		<span>or choose from</span>
		{#if googleAllowed}
			<PlayerButton
				icon={driveIcon}
				title="Google Drive"
				onclick={() => openCloudPicker('google', onselect)}
			/>
		{/if}
		{#if dropboxAllowed}
			<PlayerButton
				icon={dropboxIcon}
				title="Dropbox"
				onclick={() => openCloudPicker('dropbox', onselect)}
			/>
		{/if}
	</div>
{/if}
