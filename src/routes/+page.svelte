<script lang="ts">
	import { resolve } from '$app/paths';
	import FileDrop from '$lib/components/FileDrop.svelte';
	import MediaWorkspace from '$lib/components/MediaWorkspace.svelte';
	import { catcut } from '$lib/icons';
	import { createLocalMediaSource, createRemoteMediaSource, type MediaSource } from '$lib/media';
	import Icon from '@iconify/svelte';
	import { BitsConfig } from 'bits-ui';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	let source = $state.raw<MediaSource | null>(null);
	let draggingMedia = $state(false);

	function isMediaType(type: string) {
		return type === '' || type.startsWith('audio/') || type.startsWith('video/');
	}

	async function openLaunchFile(launchParams: LaunchParams) {
		const handle = launchParams.files.find(
			(h: FileSystemHandle): h is FileSystemFileHandle => h.kind === 'file'
		);
		if (!handle) return;

		const file = await handle.getFile();
		if (isMediaType(file.type)) source = createLocalMediaSource(file);
	}

	onMount(() => {
		const location = new URL(window.location.href);
		const mediaUrl = location.searchParams.get('url');
		if (mediaUrl) source = createRemoteMediaSource(mediaUrl);
		const sharedMediaId = location.searchParams.get('shared-media');
		if (sharedMediaId) void openSharedMedia(sharedMediaId);
		if (location.searchParams.has('share-error')) toast.error('Could not import the shared media.');

		window.launchQueue?.setConsumer((launchParams) => void openLaunchFile(launchParams));
	});

	async function openSharedMedia(id: string) {
		try {
			if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('Invalid share ID');
			const cache = await caches.open('catcut-shared-media');
			const key = new URL(`/__shared-media/${id}`, window.location.origin);
			const response = await cache.match(key);
			if (!response) throw new Error('Shared media missing');
			const name = decodeURIComponent(response.headers.get('X-File-Name') ?? 'shared-media');
			const file = new File([await response.blob()], name, {
				type: response.headers.get('Content-Type') ?? ''
			});
			await cache.delete(key);
			source = createLocalMediaSource(file);
		} catch {
			toast.error('Could not import the shared media.');
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
		if (file) source = createLocalMediaSource(file);
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
		{#key source}
			<BitsConfig defaultPortalTo="#catcut-player">
				<MediaWorkspace {source} onclose={() => (source = null)} />
			</BitsConfig>
		{/key}
	{:else}
		<div class="text-accent flex items-center justify-center gap-2 text-xl font-black">
			<Icon icon={catcut} class="size-6" />
			<h1>catcut</h1>
		</div>
		<FileDrop dragging={draggingMedia} onselect={(selectedSource) => (source = selectedSource)} />

		<div class="fixed bottom-0 flex flex-wrap gap-2 p-2 font-medium">
			<a href={resolve('/codecs')} class="hover:text-white hover:underline">Codecs</a>
		</div>
	{/if}
</main>
