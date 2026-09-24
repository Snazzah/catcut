<script lang="ts">
	import { onMount } from 'svelte';
	import type { PlayerState } from '$lib/player-state.svelte';
	import { renderTimelinePreview } from '$lib/timeline';

	let { player }: { player: PlayerState } = $props();
	let container: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let width = $state(0);
	let height = $state(0);
	let failed = $state(false);

	onMount(() => {
		const observer = new ResizeObserver(([entry]) => {
			if (!entry) return;
			width = Math.floor(entry.contentRect.width);
			height = Math.floor(entry.contentRect.height);
		});
		observer.observe(container);
		return () => observer.disconnect();
	});

	$effect(() => {
		if (player.loadState.status !== 'ready' || width <= 0 || height <= 0) return;
		const controller = new AbortController();
		failed = false;
		void renderTimelinePreview({
			player,
			canvas,
			width,
			height,
			signal: controller.signal
		}).catch(() => {
			if (!controller.signal.aborted) failed = true;
		});
		return () => controller.abort();
	});
</script>

<div class="relative h-full w-full overflow-hidden bg-neutral-900" bind:this={container}>
	<canvas class="block h-full w-full" aria-hidden="true" bind:this={canvas}></canvas>
	{#if failed}
		<div class="absolute inset-0 grid place-items-center bg-neutral-900 text-xs text-neutral-400">
			Preview unavailable
		</div>
	{/if}
</div>
