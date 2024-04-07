<script lang="ts">
	import Icon from "@iconify/svelte";
	import fileIcon from "@iconify-icons/mdi/file";
	import dropboxIcon from "@iconify-icons/mdi/dropbox";
	import worryIcon from "@iconify-icons/fluent-emoji/worried-face";
	import { downloadedBytes, ffmpegReady, loadFFmpeg, totalBytes } from "$lib/ffmpeg";
	import { filesize } from "filesize";
	import { createEventDispatcher, onMount } from "svelte";
	import { loadDropbox, type DropboxChooser } from "$lib/dropbox";
	import { RemoteFile } from "$lib/util";
	import Modal from "./Modal.svelte";

	let dispatch = createEventDispatcher();

	const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/mov', 'video/m4v'];

	let inputFile: File | RemoteFile | undefined = undefined;
	let files: FileList | undefined = undefined;
	let input: HTMLInputElement;
	$: if (files && files[0] && typeAllowed(files[0].type)) inputFile = files[0];
	$: if (inputFile && $ffmpegReady) dispatch('file', inputFile);

	let droppingFile = false;

	let noSelect = false;
	let ffmpegLoadFail = false;
	let dropboxAvailable = false;

	let modalOpen = false;
	let rejectionMessage = '';

	async function load() {
		try {
			ffmpegLoadFail = false;
			noSelect = true;
			await loadFFmpeg();
			noSelect = false;
		} catch (e) {
			console.error('Failed to load ffmpeg.wasm', e);
			ffmpegLoadFail = true;
		}
	}

	function typeAllowed(type: string) {
		rejectionMessage = '';
		if (type === '') rejectionMessage = 'Unknown file type.';
		else if (!ALLOWED_TYPES.includes(type)) rejectionMessage = `The file type "${type}" is not supported.`;

		if (rejectionMessage) modalOpen = true;
		return !rejectionMessage;
	}

	function chooseDropbox() {
		if (!dropboxAvailable) return;

		(window as unknown as { Dropbox: DropboxChooser }).Dropbox.choose({
			async success(files) {
				noSelect = true;
				if (files[0]) {
					const type = RemoteFile.extensionToType(files[0].name.split('.').reverse()[0]);
					if (typeAllowed(type)) inputFile = await RemoteFile.fetch(files[0].link, files[0].name);
				}
				noSelect = false;
    	},
			cancel() {
				console.log('Dropbox chooser cancelled.');
			},

			linkType: 'direct',
			extensions: ['video'],
			multiselect: false
		});
	}

	onMount(async () => {
		loadDropbox().then(() => dropboxAvailable = true);
		if ($ffmpegReady) return;
		load();
	});
</script>

<svelte:document
	on:dragover|preventDefault
	on:drop|preventDefault={(e) => {
		if (e.relatedTarget === null && e.dataTransfer?.types.includes('Files')) {
			files = e.dataTransfer?.files;
			droppingFile = false;
		}
	}}
	on:dragenter={(e) => {
		if (e.relatedTarget === null && e.dataTransfer?.types.includes('Files')) droppingFile = true;
	}}
	on:dragleave={(e) => {
		if (e.relatedTarget === null) droppingFile = false;
	}}
/>

<div class="flex flex-col items-center justify-center w-full gap-2">
	<input
		type="file"
		class="hidden"
		accept={ALLOWED_TYPES.join(', ')}
		bind:files={files}
		bind:this={input}
	/>
	<button
		class="filedropper"
		class:--dropping={droppingFile}
		class:--init={!$ffmpegReady}
		class:--failed={ffmpegLoadFail}
		disabled={noSelect && !ffmpegLoadFail}
		on:click={() => {
			if (ffmpegLoadFail) load();
			else input.click();
		}}
	>
		<div class="relative transition-all w-full" class:text-xl={droppingFile && !noSelect}>
			<Icon icon={fileIcon} class={`transition-all absolute w-full h-full ${(droppingFile && !noSelect) ? `scale-[2] opacity-25` : `scale-100 opacity-0`}`} />
			<div class="flex flex-col items-center justify-center w-full">
				{#if !noSelect}
					<span>
						{#if droppingFile}
							drop that file!
						{:else}
							select a file
						{/if}
					</span>
				{:else}
					{#if ffmpegLoadFail}
						<span>failed to load ffmpeg.wasm, click to retry</span>
					{:else if !$ffmpegReady}
						<span class="mb-1">loading ffmpeg.wasm...</span>
						<div class="h-2 relative bg-neutral-800 w-full rounded overflow-hidden">
							<div class="bg-violet-500 h-full transition-all" style:width={`${($downloadedBytes / $totalBytes) * 100}%`} />
						</div>
						<span class="text-xs text-neutral-400">{filesize($downloadedBytes, { standard: 'jedec' })} / {filesize($totalBytes, { standard: 'jedec' })}</span>
					{:else}
						downloading...
					{/if}
				{/if}
			</div>
		</div>
	</button>
	<span class="transition-opacity flex gap-2" class:opacity-0={noSelect} class:pointer-events-none={noSelect}>
		<span>
			or drop a file anywhere
		</span>
		{#if dropboxAvailable}
			<button title="Choose from Dropbox" on:click={chooseDropbox}>
				<Icon icon={dropboxIcon} class="w-6 h-6 transition-colors hover:text-white" />
			</button>
		{/if}
	</span>
</div>

<Modal
	open={modalOpen}
	on:clickout={() => modalOpen = false}
	className="w-96 border-2 px-2 py-4 rounded-xl shadow-md flex-col justify-center items-center inline-flex bg-red-950 border-red-800"
>
	<Icon icon={worryIcon} class="w-32 h-32 mb-4 -mt-24" />
	<h2 class="font-bold tracking-wide text-2xl">Failed to use that file...</h2>
	<span>{rejectionMessage}</span>
</Modal>

<style>
	.filedropper {
		@apply p-4 max-w-96 w-full h-16 transition-all bg-neutral-800 rounded-lg flex flex-col items-center justify-center text-center border-2 border-neutral-500 text-white outline-none;

		&:hover {
			@apply bg-neutral-700 border-neutral-400;
		}

		&:focus {
			@apply bg-neutral-700 border-neutral-200;
		}

		&.--dropping:enabled {
			@apply h-24 bg-violet-900 border-violet-500;
		}

		&:disabled {
			@apply bg-neutral-900 border-neutral-700 text-neutral-300;

			&.--init {
				@apply h-24;
			}
		}

		&.--failed {
			@apply bg-red-950/50 border-red-900;
		}
	}
</style>
