<script lang="ts">
	import FileSelect from './FileSelect.svelte';
	import VideoEditor from './VideoEditor.svelte';
	import Footer from './Footer.svelte';
	import { RemoteFile } from '$lib/util';
	import { catcut } from '$lib/icons';
	import Icon from '@iconify/svelte';
	import AudioEditor from './AudioEditor.svelte';
	import Bulletin from './Bulletin.svelte';

	let inputFile: File | RemoteFile | undefined = undefined;
	let blobURL: string | undefined;
	$: blobURL = inputFile
		? inputFile instanceof RemoteFile
			? inputFile.url
			: URL.createObjectURL(inputFile)
		: undefined;

	function closeFile() {
		if (inputFile instanceof RemoteFile) inputFile.release();
		else if (blobURL) URL.revokeObjectURL(blobURL);
		inputFile = undefined;
	}
</script>

<svelte:head>
	<title>catcut</title>
	<link href="https://catcut.snaz.in/" rel="canonical" />
</svelte:head>

<main
	class={`flex flex-col items-center min-h-screen overflow-x-hidden ${!inputFile ? ' justify-center px-6 py-4 gap-4' : ''}`}
	class:justify-center={!inputFile}
>
	<header
		class={`flex items-center justify-center select-none ${inputFile ? 'px-6 py-4 w-full gap-2 bg-black' : 'flex-col'}`}
	>
		<h1
			class="text-3xl font-extrabold text-violet-500 flex items-center gap-1"
			class:flex-col={!inputFile}
		>
			<Icon
				icon={catcut}
				class={!inputFile
					? 'w-16 h-16 transition-all hover:scale-110 active:scale-90 cursor-pointer'
					: ''}
			/>
			<div class="flex items-center gap-2">
				<span>catcut</span>
				<small class="text-black bg-violet-500 px-2 rounded text-sm font-extrabold">alpha</small>
			</div>
		</h1>
		{#if !inputFile}
			<p>in-browser media editing</p>
		{/if}
	</header>

	{#if !inputFile}
		<Bulletin />
		<FileSelect on:file={(e) => (inputFile = e.detail)} />
		<Footer />
	{/if}

	{#if inputFile && blobURL}
		{#if inputFile.type.startsWith('video/')}
			<VideoEditor file={inputFile} {blobURL} on:close={closeFile} />
		{:else if inputFile.type.startsWith('audio/')}
			<AudioEditor file={inputFile} {blobURL} on:close={closeFile} />
		{/if}
	{/if}
</main>
