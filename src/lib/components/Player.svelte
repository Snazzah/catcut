<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { MediaSource } from '$lib/media';
	import { PlayerState } from '$lib/player-state.svelte';

	let { source, onclose }: { source: MediaSource; onclose: () => void } = $props();
	const player = new PlayerState(untrack(() => source));
	let canvas: HTMLCanvasElement;
	let playerElement: HTMLElement;
	let scrubTime = $state<number | null>(null);
	let scrubbing = false;
	let resumeAfterScrub = false;
	let shownTime = $derived(scrubTime ?? player.currentTime);

	onMount(() => {
		player.attachCanvas(canvas);
		void player.load().catch((error: unknown) => {
			if (player.disposed) return;

			alert(error instanceof Error ? error.message : String(error));
			onclose();
		});

		return () => player.dispose();
	});

	function startScrub() {
		if (scrubbing) return;
		scrubbing = true;
		resumeAfterScrub = player.beginScrub();
	}

	function handleScrub(event: Event) {
		if (!(event.currentTarget instanceof HTMLInputElement)) return;
		startScrub();
		scrubTime = event.currentTarget.valueAsNumber;
		player.previewScrub(scrubTime);
	}

	function commitScrub(event: Event) {
		if (!(event.currentTarget instanceof HTMLInputElement) || !scrubbing) return;
		const time = event.currentTarget.valueAsNumber;
		const shouldResume = resumeAfterScrub;
		scrubTime = null;
		scrubbing = false;
		resumeAfterScrub = false;
		void player.endScrub(time, shouldResume);
	}

	function handleVolume(event: Event) {
		if (!(event.currentTarget instanceof HTMLInputElement)) return;
		player.setVolume(event.currentTarget.valueAsNumber);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.target instanceof HTMLInputElement) return;

		if (event.code === 'Space' || event.code === 'KeyK') {
			void player.togglePlayback();
		} else if (event.code === 'ArrowLeft') {
			void player.seek(player.currentTime - 5);
		} else if (event.code === 'ArrowRight') {
			void player.seek(player.currentTime + 5);
		} else if (event.code === 'KeyM') {
			player.toggleMuted();
		} else if (event.code === 'KeyF') {
			void toggleFullscreen();
		} else {
			return;
		}

		event.preventDefault();
	}

	async function toggleFullscreen() {
		if (document.fullscreenElement) await document.exitFullscreen();
		else await playerElement.requestFullscreen();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="grid w-full max-w-4xl gap-3 bg-neutral-950 p-3" bind:this={playerElement}>
	<div class="grid min-h-48 place-items-center overflow-hidden bg-black">
		{#if player.loadState.status === 'loading'}
			<p class="col-start-1 row-start-1 m-0 text-sm text-neutral-300">
				Loading {player.filename}…
			</p>
		{:else if !player.hasVideo}
			<p class="col-start-1 row-start-1 m-0 px-6 text-center text-neutral-300">
				{player.loadState.metadata.tags.title ?? player.filename}
			</p>
		{/if}

		<canvas
			class={['col-start-1 row-start-1 max-h-[70svh] max-w-full', !player.hasVideo && 'hidden']}
			bind:this={canvas}
			onclick={() => void player.togglePlayback()}
		></canvas>
	</div>

	{#if player.loadState.status === 'ready'}
		<div class="grid gap-2" aria-label="Media controls">
			<input
				type="range"
				min={player.startTime}
				max={player.endTime}
				step="0.001"
				value={shownTime}
				onpointerdown={startScrub}
				oninput={handleScrub}
				onchange={commitScrub}
				onpointerup={commitScrub}
				onpointercancel={commitScrub}
				aria-label="Seek"
			/>

			<div class="flex items-center gap-3 text-sm text-neutral-200">
				<button type="button" onclick={() => void player.togglePlayback()}>
					{player.paused ? 'Play' : 'Pause'}
				</button>
				<span class="tabular-nums">
					{player.formatTimestamp(shownTime)} / {player.formatTimestamp(player.endTime)}
				</span>

				{#if player.hasAudio}
					<button type="button" onclick={() => player.toggleMuted()}>
						{player.muted ? 'Unmute' : 'Mute'}
					</button>
					<input
						class="w-24"
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={player.volume}
						oninput={handleVolume}
						aria-label="Volume"
					/>
				{/if}

				<button class="ml-auto" type="button" onclick={() => void toggleFullscreen()}>
					Fullscreen
				</button>
			</div>
		</div>

		{#if player.loadState.warning}
			<p class="m-0 text-sm text-amber-300">{player.loadState.warning}</p>
		{/if}
	{/if}

	<button class="justify-self-start text-sm text-neutral-300" type="button" onclick={onclose}>
		Close
	</button>
</section>
