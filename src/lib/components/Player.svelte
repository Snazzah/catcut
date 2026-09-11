<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { MediaSource } from '$lib/media';
	import { PlayerState } from '$lib/player-state.svelte';

	let { source, onclose }: { source: MediaSource; onclose: () => void } = $props();
	const player = new PlayerState(untrack(() => source));

	onMount(() => {
		void player.load().catch((error: unknown) => {
			if (player.disposed) return;

			alert(error instanceof Error ? error.message : String(error));
			onclose();
		});

		return () => player.dispose();
	});
</script>

<section class="grid w-full max-w-3xl gap-4">
	{#if player.loadState.status === 'loading'}
		<p class="m-0 text-center text-sm text-neutral-300">Loading {player.filename}…</p>
	{:else}
		{@const metadata = player.loadState.metadata}

		{#if metadata.video}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				class="max-h-[60svh] w-full bg-neutral-900"
				src={player.sourceUrl}
				controls
				playsinline
				bind:currentTime={player.currentTime}
				bind:paused={player.paused}
			></video>
		{:else}
			<audio
				class="w-full bg-neutral-900"
				src={player.sourceUrl}
				controls
				bind:currentTime={player.currentTime}
				bind:paused={player.paused}
			></audio>
		{/if}

		<dl class="grid gap-1.5">
			<div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-3">
				<dt class="text-neutral-500">Filename</dt>
				<dd class="m-0 min-w-0 wrap-anywhere text-neutral-200">{player.filename}</dd>
			</div>
			<div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-3">
				<dt class="text-neutral-500">Source</dt>
				<dd class="m-0 min-w-0 wrap-anywhere text-neutral-200">{source.origin}</dd>
			</div>
			<div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-3">
				<dt class="text-neutral-500">Media</dt>
				<dd class="m-0 min-w-0 wrap-anywhere text-neutral-200">
					{#if metadata.video}
						{metadata.mimeType} · {metadata.video.codec ?? 'unknown codec'} ·
						{metadata.video.width}×{metadata.video.height}
					{:else if metadata.audio}
						{metadata.mimeType} · {metadata.audio.codec ?? 'unknown codec'} ·
						{metadata.audio.sampleRate} Hz · {metadata.audio.channels} ch
					{/if}
				</dd>
			</div>
			{#if metadata.tags.title}
				<div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-3">
					<dt class="text-neutral-500">Title</dt>
					<dd class="m-0 min-w-0 wrap-anywhere text-neutral-200">{metadata.tags.title}</dd>
				</div>
			{/if}
			<div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-3">
				<dt class="text-neutral-500">Paused</dt>
				<dd class="m-0 min-w-0 wrap-anywhere text-neutral-200">{player.paused}</dd>
			</div>
			<div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-3">
				<dt class="text-neutral-500">Time</dt>
				<dd class="m-0 min-w-0 wrap-anywhere text-neutral-200">
					{player.currentTime.toFixed(2)} / {player.duration.toFixed(2)} s
				</dd>
			</div>
			<div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-3">
				<dt class="text-neutral-500">Progress</dt>
				<dd class="m-0 min-w-0 wrap-anywhere text-neutral-200">
					{(player.progress * 100).toFixed(1)}%
				</dd>
			</div>
		</dl>
	{/if}

	<button
		class="cursor-pointer justify-self-start rounded-md border-0 bg-neutral-800 px-3 py-2 text-neutral-200 hover:bg-neutral-700"
		type="button"
		onclick={onclose}>Close</button
	>
</section>
