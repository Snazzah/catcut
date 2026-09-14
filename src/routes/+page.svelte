<script lang="ts">
	import FileDrop from '$lib/components/FileDrop.svelte';
	import Player from '$lib/components/Player.svelte';
	import { catcut } from '$lib/icons';
	import { createLocalMediaSource, type MediaSource } from '$lib/media';
	import Icon from '@iconify/svelte';

	let source = $state.raw<MediaSource | null>(null);
	let draggingMedia = $state(false);

	function isMediaType(type: string) {
		return type === '' || type.startsWith('audio/') || type.startsWith('video/');
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
			<Player {source} onclose={() => (source = null)} />
		{/key}
	{:else}
		<div class="flex gap-2 justify-center items-center text-violet-500 font-black text-xl">
			<Icon icon={catcut} class="size-6" />
			<h1>catcut</h1>
		</div>
		<FileDrop dragging={draggingMedia} onselect={(selectedSource) => (source = selectedSource)} />
	{/if}
</main>
