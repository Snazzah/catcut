<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { MediaSource } from '$lib/media';
	import { PlayerState } from '$lib/player-state.svelte';
	import playIcon from '@iconify-icons/mdi/play-arrow';
	import pauseIcon from '@iconify-icons/mdi/pause';
	import fullscreenIcon from '@iconify-icons/mdi/fullscreen';
	import volumeIcon from '@iconify-icons/mdi/volume-high';
	import volumeMutedIcon from '@iconify-icons/mdi/volume-off';
	import replayIcon from '@iconify-icons/mdi/replay';
	import closeIcon from '@iconify-icons/mdi/close';
	import { Tooltip } from 'bits-ui';
	import PlayerButton from './PlayerButton.svelte';
	import PlayerSlider from './PlayerSlider.svelte';
	import SmallTooltipContent from './SmallTooltipContent.svelte';

	const SEEK_STEP_COUNT = 10_000;

	let { source, onclose }: { source: MediaSource; onclose: () => void } = $props();
	const player = new PlayerState(untrack(() => source));
	let canvas: HTMLCanvasElement;
	let playerElement: HTMLElement;
	let scrubTime = $state<number | null>(null);
	let volumeSliderExpanded = $state(false);
	let scrubbing = false;
	let resumeAfterScrub = false;
	let controlsHovered = false;
	let controlsFocused = false;
	let alternateDurationFormat = $state(false);
	let shownTime = $derived(scrubTime ?? player.currentTime);
	let seekStep = $derived(player.duration > 0 ? player.duration / SEEK_STEP_COUNT : 0.001);

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

	function handleScrub(time: number) {
		if (!scrubbing) return;
		scrubTime = time;
		player.previewScrub(time);
	}

	function commitScrub(time: number) {
		if (!scrubbing) return;
		const shouldResume = resumeAfterScrub;
		scrubTime = null;
		scrubbing = false;
		resumeAfterScrub = false;
		void player.endScrub(time, shouldResume);
	}

	function handleControlsPointerLeave() {
		controlsHovered = false;
		if (!controlsFocused) volumeSliderExpanded = false;
	}

	function handleControlsFocusOut(event: FocusEvent) {
		if (
			event.currentTarget instanceof HTMLElement &&
			event.relatedTarget instanceof Node &&
			event.currentTarget.contains(event.relatedTarget)
		)
			return;
		controlsFocused = false;
		if (!controlsHovered) volumeSliderExpanded = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (
			event.target instanceof HTMLInputElement ||
			(event.target instanceof HTMLElement && event.target.closest('[role="slider"]'))
		)
			return;

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
	<div
		class="absolute inset-x-0 top-0 z-10 flex justify-between gap-2 bg-linear-to-t from-black/0 via-black/50 to-black/75 p-3"
	>
		<div class="min-w-0 flex-1 font-medium text-white">
			<div class="flex min-w-0 flex-col">
				<span class="block truncate">{player.filename}</span>

				{#if player.loadState.status === 'ready' && player.loadState.warning}
					<p class="m-0 text-sm text-amber-300">{player.loadState.warning}</p>
				{/if}
			</div>
		</div>

		<PlayerButton title="Close media" icon={closeIcon} onclick={onclose} offset={8} />
	</div>

	<div
		class="absolute inset-x-0 bottom-0 z-10 grid gap-2 bg-linear-to-b from-black/0 via-black/50 to-black/75 p-3"
	>
		{#if player.loadState.status === 'ready'}
			<div
				class="grid gap-2"
				role="group"
				aria-label="Media controls"
				onpointerenter={() => (controlsHovered = true)}
				onpointerleave={handleControlsPointerLeave}
				onfocusin={() => (controlsFocused = true)}
				onfocusout={handleControlsFocusOut}
			>
				<PlayerSlider
					min={player.startTime}
					max={player.endTime}
					step={seekStep}
					value={shownTime}
					onValueChange={handleScrub}
					onValueCommit={commitScrub}
					onInteractionStart={startScrub}
					label="Seek"
				/>

				<div
					class="flex flex-wrap items-center gap-3 text-sm text-neutral-200"
					role="group"
					aria-label="Playback controls"
				>
					<PlayerButton
						title={player.progress === 1 ? 'Replay' : player.paused ? 'Play' : 'Pause'}
						icon={player.progress === 1 ? replayIcon : player.paused ? playIcon : pauseIcon}
						key="K"
						onclick={() => void player.togglePlayback()}
					/>

					{#if player.hasAudio}
						<div
							class="flex shrink-0 items-center gap-3"
							role="group"
							aria-label="Volume controls"
							onpointerenter={() => (volumeSliderExpanded = true)}
							onfocusin={() => (volumeSliderExpanded = true)}
						>
							<PlayerButton
								title={player.muted ? 'Unmute' : 'Mute'}
								icon={player.muted ? volumeMutedIcon : volumeIcon}
								onclick={() => void player.toggleMuted()}
								key="M"
							/>
							<div
								class={[
									'transition-[width,opacity] duration-200 ease-out',
									volumeSliderExpanded ? 'w-28 opacity-100' : 'pointer-events-none w-0 opacity-0'
								]}
								aria-hidden={!volumeSliderExpanded}
							>
								<Tooltip.Root
									delayDuration={200}
									disabled={!volumeSliderExpanded}
									disableHoverableContent
								>
									<Tooltip.Trigger tabindex={-1} type={undefined}>
										{#snippet child({ props })}
											<div {...props}>
												<PlayerSlider
													class="w-24"
													min={0}
													max={1}
													step={0.01}
													value={player.volume}
													disabled={!volumeSliderExpanded}
													onValueChange={(volume) => player.setVolume(volume)}
													label="Volume"
												/>
											</div>
										{/snippet}
									</Tooltip.Trigger>
									<SmallTooltipContent>Volume</SmallTooltipContent>
								</Tooltip.Root>
							</div>
						</div>
					{/if}

					<button class="font-medium text-neutral-50 tabular-nums group cursor-pointer" onclick={() => (alternateDurationFormat = !alternateDurationFormat)}>
						<span class="group-hover:underline font-medium">{alternateDurationFormat ? '-' : ''}{player.formatTimestamp(alternateDurationFormat ? player.endTime - shownTime : shownTime)}</span>
						<span class="text-neutral-300">/ {player.formatTimestamp(player.endTime)}</span>
					</button>

					<!-- boowomp -->
					<span class="mx-auto"></span>

					<PlayerButton
						title="Fullscreen"
						icon={fullscreenIcon}
						onclick={() => void toggleFullscreen()}
						key="F"
					/>
				</div>
			</div>
		{/if}
	</div>
</section>
