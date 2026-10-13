<script lang="ts">
	import { resolve } from '$app/paths';
	import FileDrop from '$lib/components/FileDrop.svelte';
	import MediaWorkspace from '$lib/components/MediaWorkspace.svelte';
	import ResponsiveModal from '$lib/components/common/ResponsiveModal.svelte';
	import { catcut } from '$lib/icons';
	import { queue, createRemoteMediaSource, createLocalMediaSource } from '$lib/store.svelte';
	import Icon from '@iconify/svelte';
	import { BitsConfig } from 'bits-ui';
	import { onMount, tick } from 'svelte';

	let source = $derived(queue.source);
	let editing = $state(false);
	let draggingMedia = $state(false);
	let loadError = $state<string | null>(null);

	function closeMedia() {
		queue.clear();
		editing = false;
	}

	async function showLoadError(message: string) {
		closeMedia();
		await tick();
		loadError = message;
	}

	function isMediaType(type: string) {
		return type === '' || type.startsWith('audio/') || type.startsWith('video/');
	}

	async function openLaunchFile(launchParams: LaunchParams) {
		const handle = launchParams.files.find(
			(h: FileSystemHandle): h is FileSystemFileHandle => h.kind === 'file'
		);
		if (!handle) return;

		try {
			const file = await handle.getFile();
			if (isMediaType(file.type)) queue.replace(createLocalMediaSource(file));
		} catch (error) {
			void showLoadError(error instanceof Error ? error.message : String(error));
		}
	}

	onMount(() => {
		const location = new URL(window.location.href);
		const mediaUrl = location.searchParams.get('url');
		if (mediaUrl) queue.replace(createRemoteMediaSource(mediaUrl));
		const sharedMediaId = location.searchParams.get('shared-media');
		if (sharedMediaId) void openSharedMedia(sharedMediaId);
		const shareError = location.searchParams.get('share-error');
		if (shareError) {
			const messages: Record<string, string> = {
				parse: 'Chrome could not read the shared file data.',
				invalid: 'The share did not contain an accepted media file.',
				missing: 'The share did not contain a media file.',
				storage: 'Chrome could not store the shared file on this device.'
			};
			const mime = location.searchParams.get('mime');
			void showLoadError(
				shareError === 'type'
					? `The shared file has an unsupported type: ${mime || '(empty)'}.`
					: (messages[shareError] ?? 'Could not import the shared media.')
			);
			location.searchParams.delete('share-error');
			location.searchParams.delete('mime');
			window.history.replaceState(window.history.state, '', location);
		}

		window.launchQueue?.setConsumer((launchParams) => void openLaunchFile(launchParams));
	});

	async function openSharedMedia(id: string) {
		let failure = 'The shared media link is invalid.';
		try {
			if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('Invalid share ID');
			failure = 'Chrome could not open the shared file storage.';
			const cache = await caches.open('catcut-shared-media');
			failure = 'The shared file was not found in browser storage.';
			const key = new URL(`/__shared-media/${id}`, window.location.origin);
			const response = await cache.match(key);
			if (!response) throw new Error('Shared media missing');
			failure = 'Chrome could not read the saved shared file.';
			const name = decodeURIComponent(response.headers.get('X-File-Name') ?? 'shared-media');
			const file = new File([await response.blob()], name, {
				type: response.headers.get('Content-Type') ?? ''
			});
			queue.replace(createLocalMediaSource(file));
			await cache.delete(key).catch(() => undefined);
		} catch {
			void showLoadError(failure);
		} finally {
			const url = new URL(window.location.href);
			url.searchParams.delete('shared-media');
			window.history.replaceState(window.history.state, '', url);
		}
	}

	function isMediaDrag(dataTransfer: DataTransfer | null) {
		if (!dataTransfer?.types.includes('Files')) return false;

		const fileItems = [...dataTransfer.items].filter((item) => item.kind === 'file');
		return fileItems.length === 0 || fileItems.some((item) => isMediaType(item.type));
	}

	function handleDrag(event: DragEvent) {
		if (!isMediaDrag(event.dataTransfer)) return;

		event.preventDefault();
		draggingMedia = true;
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
	}

	function handleDragLeave(event: DragEvent) {
		if (event.relatedTarget === null) draggingMedia = false;
	}

	function handleDrop(event: DragEvent) {
		if (!isMediaDrag(event.dataTransfer)) return;

		event.preventDefault();
		draggingMedia = false;

		const file = [...(event.dataTransfer?.files ?? [])].find((item) => isMediaType(item.type));
		if (file) queue.replace(createLocalMediaSource(file));
	}
</script>

<svelte:window
	ondragenter={handleDrag}
	ondragover={handleDrag}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
/>

<svelte:head>
	<title>catcut</title>
	<link href="https://catcut.snaz.in/" rel="canonical" />
</svelte:head>

<main
	class={source
		? 'h-svh w-full overflow-hidden'
		: 'flex min-h-svh flex-col items-center justify-center gap-2 p-6'}
>
	{#if source}
		<BitsConfig defaultPortalTo="#catcut-player">
			<MediaWorkspace
				{source}
				bind:editing
				onloaderror={(message) => void showLoadError(message)}
				onclose={closeMedia}
			/>
		</BitsConfig>
	{:else}
		<div class="text-accent flex items-center justify-center gap-2 text-xl font-black">
			<Icon icon={catcut} class="size-6" />
			<h1>catcut</h1>
		</div>
		<FileDrop
			dragging={draggingMedia}
			onselect={(selectedSource) => queue.replace(selectedSource)}
		/>

		<div class="fixed bottom-0 flex flex-wrap gap-2 p-2 font-medium">
			<a href={resolve('/codecs')} class="hover:text-white hover:underline">Codecs</a>
		</div>
	{/if}
</main>

<ResponsiveModal
	open={loadError !== null}
	title="Could not load file"
	onOpenChange={(open) => {
		if (!open) loadError = null;
	}}
>
	<p class="text-sm wrap-break-word whitespace-pre-wrap text-neutral-300">{loadError}</p>
	{#snippet buttons()}
		<button
			class="cursor-pointer rounded-lg bg-neutral-700 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-600"
			onclick={() => (loadError = null)}
		>
			Okay
		</button>
	{/snippet}
</ResponsiveModal>
