<script lang="ts">
	import dropboxIcon from '@iconify-icons/mdi/dropbox';
	import { onMount } from 'svelte';
	import { PUBLIC_DROPBOX_CLIENT_ID } from '$app/env/public';
	import { dropboxAllowed, loadScript, sendPickedSources } from '#lib/cloud-pickers.js';
	import PickerStatus from '../PickerStatus.svelte';

	let id = $state<string | null>();
	let ready = $state(false);
	let error = $state<string | null>(null);

	function choose() {
		window.Dropbox!.choose({
			linkType: 'direct',
			multiselect: true,
			extensions: ['video', 'audio'],
			success(files) {
				sendPickedSources(
					id!,
					files.map((file) => ({
						origin: 'remote',
						url: file.link,
						name: file.name,
						size: file.bytes
					}))
				);
				window.close();
			}
		});
	}

	onMount(() => {
		id = new URL(location.href).searchParams.get('id');
		if (!id || !dropboxAllowed) return;

		loadScript('https://www.dropbox.com/static/api/2/dropins.js', {
			id: 'dropboxjs',
			'data-app-key': PUBLIC_DROPBOX_CLIENT_ID
		})
			.then(() => (ready = true))
			.catch(() => (error = 'Could not load Dropbox.'));
	});
</script>

<svelte:head>
	<title>Dropbox - catcut</title>
</svelte:head>

{#if !dropboxAllowed}
	<PickerStatus icon={dropboxIcon} title="Dropbox" message="Dropbox is not set up." error />
{:else if id === null}
	<PickerStatus
		icon={dropboxIcon}
		title="Dropbox"
		message="Open this from the catcut home page."
		error
	/>
{:else if error}
	<PickerStatus icon={dropboxIcon} title="Dropbox" message={error} error />
{:else if !ready}
	<PickerStatus icon={dropboxIcon} title="Dropbox" message="Loading Dropbox..." />
{:else}
	<PickerStatus icon={dropboxIcon} title="Dropbox" message="Pick files from your Dropbox.">
		<button
			class="cursor-pointer rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-[background-color,scale] hover:bg-violet-500 active:scale-95"
			onclick={choose}>Choose files</button
		>
	</PickerStatus>
{/if}
