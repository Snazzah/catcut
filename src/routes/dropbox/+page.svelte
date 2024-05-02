<script lang="ts">
	import { loadDropbox } from '$lib/dropbox';
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import dropboxIcon from '@iconify-icons/mdi/dropbox';

	let available = false;
	let failed = false;
	let failedOpen = false;
	let redirecting = false;
	const isolated = window.crossOriginIsolated;

	function prompt() {
		window.Dropbox.choose({
			async success(files) {
				console.log(files);
				if (files[0]) {
					redirecting = true;
					location.href = `/?${new URLSearchParams({
						file: files[0].link,
						filename: files[0].name
					}).toString()}`;
				}
			},
			cancel() {
				console.log('Dropbox chooser cancelled.');
				location.href = '/';
			},

			linkType: 'direct',
			extensions: ['video', 'audio'],
			multiselect: false
		});
		failedOpen = false;
	}

	onMount(async () => {
		if (isolated) return;
		try {
			await loadDropbox();
			available = true;
			prompt();
		} catch (e) {
			console.log(e);
			failedOpen = (e as any).message.startsWith('Failed to open/load the window.');
			if (!failedOpen) failed = true;
		}
	});
</script>

<svelte:window
	on:mousedown={() => {
		if (failedOpen) prompt();
	}}
/>

<svelte:head>
	<title>Dropbox Chooser - catcut</title>
</svelte:head>

<main
	class="flex flex-col items-center justify-center min-h-screen overflow-hidden"
	class:cursor-pointer={failedOpen}
>
	<Icon icon={dropboxIcon} class="w-48 h-48" />
	{#if isolated}
		<span class="text-red-400"
			>Cannot use the Dropbox chooser in a cross-origin isolated context.</span
		>
	{:else if failedOpen}
		<span class="text-violet-400">Click anywhere to open the Dropbox chooser.</span>
		<small
			>Note: You can allow pop-ups for this site to automatically open the chooser on future
			attempts.</small
		>
	{:else if failed}
		<span class="text-red-300">Failed to load Dropbox chooser. You can close this tab now.</span>
	{:else if redirecting}
		<span>Redirecting you back to the app...</span>
	{:else if !available}
		<span>Loading Dropbox chooser...</span>
	{:else}
		<span class="text-white">Please choose a file from the popup, or close it to cancel.</span>
	{/if}
</main>
