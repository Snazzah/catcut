<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { MediaSource } from '$lib/media';
	import { PlayerState } from '$lib/player-state.svelte';
	import playIcon from '@iconify-icons/mdi/play-arrow';
	import pauseIcon from '@iconify-icons/mdi/pause';
	import fullscreenIcon from '@iconify-icons/mdi/fullscreen';
	import volumeIcon from '@iconify-icons/mdi/volume-high';
	import volumeMutedIcon from '@iconify-icons/mdi/volume-off';
	import closeIcon from '@iconify-icons/mdi/close';
	import PlayerButton from './PlayerButton.svelte';

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

<section class="relative h-full w-full overflow-hidden bg-neutral-950" bind:this={playerElement}>
	<div class="grid h-full w-full place-items-center overflow-hidden bg-black">
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
			class={[
				'col-start-1 row-start-1 h-full min-h-0 w-full min-w-0 object-contain',
				!player.hasVideo && 'hidden'
			]}
			bind:this={canvas}
			onclick={() => void player.togglePlayback()}
		></canvas>
	</div>
	<div class="absolute inset-x-0 top-0 z-10 flex justify-between gap-2 bg-linear-to-t from-black/0 via-black/50 to-black/75 p-3">
		<div class="flex gap-2 text-white font-medium">
			<div class="flex flex-col">
				<span>{player.filename}</span>

				{#if player.loadState.status === 'ready' && player.loadState.warning}
					<p class="m-0 text-sm text-amber-300">{player.loadState.warning}</p>
				{/if}
			</div>

		</div>

		<PlayerButton
			title="Close media"
			icon={closeIcon}
			onclick={onclose}
		/>
	</div>

	<div class="absolute inset-x-0 bottom-0 z-10 grid gap-2 bg-linear-to-b from-black/0 via-black/50 to-black/75 p-3">
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

				<div class="flex flex-wrap items-center gap-3 text-sm text-neutral-200">
					<PlayerButton
						title={player.paused ? 'Play' : 'Pause'}
						icon={player.paused ? playIcon : pauseIcon}
						onclick={() => void player.togglePlayback()}
					/>

					{#if player.hasAudio}
						<PlayerButton
							title={player.muted ? 'Unmute' : 'Mute'}
							icon={player.muted ? volumeMutedIcon : volumeIcon}
							onclick={() => void player.toggleMuted()}
						/>
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

					<span class="tabular-nums">
						{player.formatTimestamp(shownTime)} / {player.formatTimestamp(player.endTime)}
					</span>

					<!-- boowomp -->
					<span class="mx-auto"></span>


					<PlayerButton
						title="Fullscreen"
						icon={fullscreenIcon}
						onclick={() => void toggleFullscreen()}
					/>
				</div>
			</div>
		{/if}
	</div>
</section>
