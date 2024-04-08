<script lang="ts">
	import { onMount } from "svelte";
	import debounce from 'just-debounce-it';
	import range from 'just-range';
	import { blobToDataURL } from "$lib/util";
	import { fade } from "svelte/transition";

	export let videoWidth: number;
	export let videoHeight: number;
	export let duration: number;
	export let src: string;

	let timelineWidth = 0;
	const timelineHeight = 48;

	const canvas = new OffscreenCanvas(1, 1);
	const video = document.createElement('video');
	$: videoReady = timelineWidth > 0 && videoWidth > 0 && videoHeight > 0 && duration > 0;

	let previewStillWidth = 0;
	let previewSegments = 0;
	$: if (videoReady) {
		previewStillWidth = Math.floor((videoWidth / videoHeight) * timelineHeight);
		previewSegments = Math.ceil(timelineWidth / previewStillWidth);
	}

	let previewImages: Record<number, string> = {};
	let renderQueued = false;
	let rendering = false;
	let neverRendered = true;
	const debounceQueueRender = debounce(() => renderQueued = true, 250);
	$: if (videoReady) fakeEffect(timelineWidth);
	$: if (videoReady && renderQueued && !rendering) render();

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function fakeEffect(width: number) {
		if (width === 0) return;
		if (neverRendered) render();
		else debounceQueueRender();
	}

	async function waitUntilLoad(): Promise<void> {
		return new Promise((resolve, reject) => {
			let onLoad = () => {
				video.removeEventListener('error', onError);
				resolve();
			}
			let onError = () => {
				video.removeEventListener('canplay', onLoad);
				reject();
			}
			video.addEventListener('canplay', onLoad, { once: true });
			video.addEventListener('error', onError, { once: true });
		})
	}

	async function render() {
		neverRendered = false;
		renderQueued = false;
		rendering = true;
		canvas.width = Math.floor((videoWidth / videoHeight) * timelineHeight);
		canvas.height = timelineHeight;
		const ctx = canvas.getContext('2d')!;
		const segments = previewSegments;
		console.log('Rendering preview stills', segments);
		previewImages = {};

		for (let i = 0; i < segments; i++) {
			const time = Math.min(1, ((i + 0.5) * previewStillWidth) / timelineWidth) * duration;
			video.currentTime = time;
			await waitUntilLoad();
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
			const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 1 });
			previewImages[i] = await blobToDataURL(blob);
		}

		rendering = false;
	}

	onMount(() => {
		video.src = src;
		video.muted = true;
		video.load();
	});
</script>

<div class="flex h-full pointer-events-none overflow-hidden" bind:clientWidth={timelineWidth}>
	{#each range(previewSegments) as i}
		<div
			class="preview-still h-full relative opacity-75 bg-cover"
			style:aspect-ratio={`${videoWidth} / ${videoHeight}`}
		>
			{#if previewImages[i]}
				<!-- svelte-ignore a11y-missing-attribute -->
				<img transition:fade={{ duration: 100 }} src={previewImages[i]} class="absolute w-full h-full block object-cover" />
			{/if}
		</div>
		<!-- <PreviewStill {videoWidth} {videoHeight} src={blobURL} snapAt={Math.min(1, ((i + 0.5) * previewStillWidth) / timelineWidth) * duration} /> -->
	{/each}
</div>

<style>
	.preview-still {
		@apply bg-violet-950;

		&:nth-child(even) {
			@apply bg-violet-900;
		}
	}
</style>
