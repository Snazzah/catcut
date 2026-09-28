<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { PlayerState } from '$lib/player-state.svelte';
	import fullscreenIcon from '@iconify-icons/mdi/fullscreen';
	import loadingIcon from '@iconify-icons/mdi/loading';
	import editIcon from '@iconify-icons/mdi/movie-edit-outline';
	import PlayerButton from './PlayerButton.svelte';
	import PlayerPlayButton from './PlayerPlayButton.svelte';
	import PlayerSlider from './PlayerSlider.svelte';
	import PlayerSettings from './PlayerSettings.svelte';
	import PlayerVolumeControl from './PlayerVolumeControl.svelte';
	import Icon from '@iconify/svelte';
	import { mobile, surfaces } from '$lib/platform.svelte';

	const SEEK_STEP_COUNT = 10_000;
	const MOBILE_CONTROLS_TIMEOUT_MS = 3_000;
	type Props = {
		player: PlayerState;
		onclose: () => void;
		onedit?: () => void;
		onfullscreen: () => void;
		controlsVisible?: boolean;
		showControls?: boolean;
		overlay?: Snippet;
	};

	let {
		player,
		onclose,
		onedit,
		onfullscreen,
		controlsVisible = $bindable(true),
		showControls = true,
		overlay
	}: Props = $props();
	let canvas: HTMLCanvasElement;
	let scrubTime = $state<number | null>(null);
	let scrubbing = false;
	let resumeAfterScrub = false;
	let alternateDurationFormat = $state(false);
	let shownTime = $derived(scrubTime ?? player.currentTime);
	let seekStep = $derived(player.duration > 0 ? player.duration / SEEK_STEP_COUNT : 0.001);

	// Controls
	let playerHovered = $state(false);
	let documentFocused = $state(true);
	let mobileControlsVisible = $state(false);
	let mobileControlsTimeout: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		controlsVisible =
			showControls &&
			(mobile.current
				? mobileControlsVisible || surfaces.open
				: documentFocused || playerHovered || player.paused || surfaces.open);
	});

	$effect(() => {
		if (surfaces.open) clearMobileControlsTimeout();
		else showMobileControls();
	});

	$effect(() => {
		if (player.paused) {
			clearMobileControlsTimeout();
			mobileControlsVisible = true;
		} else if (!surfaces.open && mobileControlsVisible) showMobileControls();
	});

	onMount(() => {
		documentFocused = document.hasFocus();
		player.attachCanvas(canvas);
		void player.load().catch((error: unknown) => {
			if (player.disposed) return;

			alert(error instanceof Error ? error.message : String(error));
			void onclose();
		});

		return () => {
			clearMobileControlsTimeout();
			player.dispose();
			document.title = 'catcut';
		};
	});

	function clearMobileControlsTimeout() {
		if (mobileControlsTimeout === undefined) return;
		clearTimeout(mobileControlsTimeout);
		mobileControlsTimeout = undefined;
	}

	function showMobileControls() {
		if (!mobile.current) return;
		mobileControlsVisible = true;
		clearMobileControlsTimeout();
		if (surfaces.open || player.paused) return;
		mobileControlsTimeout = setTimeout(() => {
			mobileControlsTimeout = undefined;
			if (surfaces.open || player.paused) return;
			mobileControlsVisible = false;
		}, MOBILE_CONTROLS_TIMEOUT_MS);
	}

	function handlePlayerClick() {
		if (!mobile.current) {
			void player.togglePlayback();
			return;
		}

		if (mobileControlsVisible) {
			clearMobileControlsTimeout();
			mobileControlsVisible = false;
		} else {
			showMobileControls();
		}
	}

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

	function handleKeydown(event: KeyboardEvent) {
		if (event.defaultPrevented) return;

		if (
			event.target instanceof HTMLElement &&
			event.target.closest(
				'button, a, input, select, textarea, [contenteditable="true"], [role="slider"]'
			)
		)
			return;

		if (event.code === 'Space' || event.code === 'KeyK') {
			void player.togglePlayback();
		} else if (event.code === 'ArrowLeft') {
			void player.seek(player.currentTime - 5);
		} else if (event.code === 'ArrowRight') {
			void player.seek(player.currentTime + 5);
		} else if (player.paused && (event.code === 'Comma' || event.code === 'Period')) {
			void player.stepFrame(event.code === 'Comma' ? -1 : 1);
		} else if (event.code === 'KeyM') {
			player.toggleMuted();
		} else if (event.code === 'KeyF') {
			void onfullscreen();
		} else if (event.code === 'KeyE') {
			void onedit?.();
		} else if (event.code === 'Escape') {
			void onclose();
		} else {
			return;
		}

		event.preventDefault();
	}
</script>

<svelte:window
	onkeydown={handleKeydown}
	onfocus={() => (documentFocused = true)}
	onblur={() => (documentFocused = false)}
/>

<section
	aria-label="Media player"
	class="relative h-full w-full bg-neutral-950"
	onpointerenter={() => (playerHovered = true)}
	onpointerleave={() => (playerHovered = false)}
>
	<!-- main area -->
	<div class="relative grid h-full w-full place-items-center bg-black">
		{#if player.loadState.status === 'loading'}
			<p class="m-0 text-sm text-neutral-300">
				<Icon icon={loadingIcon} class="size-16 animate-spin" />
			</p>
		{:else if !player.hasVideo}
			<!-- Audio view -->
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<div
				class="m-0 flex h-full w-full min-w-0 flex-col items-center justify-center gap-6 bg-linear-to-t from-violet-950/50 to-transparent px-6 text-center text-neutral-200"
				onclick={handlePlayerClick}
			>
				{#if player.coverImageUrl}
					<img
						src={player.coverImageUrl}
						alt="Cover art"
						class="size-[min(16rem,75vw,75vh)] shrink-0 rounded-lg object-cover shadow-2xl"
					/>
				{/if}
				<div class="flex w-full max-w-lg min-w-0 flex-col items-center justify-center">
					<h3
						class="w-full truncate text-2xl font-bold text-white"
						title={player.loadState.metadata.tags.title ?? player.filename}
					>
						{player.loadState.metadata.tags.title ?? player.filename}
					</h3>
					{#if player.loadState.metadata.tags.artist}
						<h4
							class="w-full truncate text-xl text-neutral-100"
							title={player.loadState.metadata.tags.artist}
						>
							{player.loadState.metadata.tags.artist}
						</h4>
					{/if}
					{#if player.loadState.metadata.tags.album}
						<span class="w-full truncate" title={player.loadState.metadata.tags.album}
							>{player.loadState.metadata.tags.album}</span
						>
					{/if}
				</div>
			</div>
		{/if}

		<canvas
			class={[
				'col-start-1 row-start-1 h-full min-h-0 w-full min-w-0 object-contain',
				!player.hasVideo && 'hidden'
			]}
			bind:this={canvas}
			onclick={handlePlayerClick}
		></canvas>

		{@render overlay?.()}
	</div>

	<!-- Bottom area -->
	<div
		class={[
			'absolute inset-x-0 bottom-(--saib) z-10 grid gap-2 bg-linear-to-b from-black/0 via-black/50 to-black/75 p-3 transition-opacity duration-200',
			controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
		]}
		aria-hidden={!controlsVisible}
		inert={!controlsVisible}
		onpointerdown={showMobileControls}
	>
		{#if player.loadState.status === 'ready'}
			<div class="grid gap-2" role="group" aria-label="Media controls">
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
					<PlayerPlayButton {player} offset={36} />
					<PlayerVolumeControl {player} offset={36} />

					<button
						class="group cursor-pointer font-medium text-neutral-50 tabular-nums"
						onclick={() => (alternateDurationFormat = !alternateDurationFormat)}
					>
						<span class="font-medium group-hover:underline"
							>{alternateDurationFormat ? '-' : ''}{alternateDurationFormat
								? player.formatDuration(player.endTime - shownTime)
								: player.formatTimestamp(shownTime)}</span
						>
						<span class="text-neutral-300">/ {player.formatTimestamp(player.endTime)}</span>
					</button>

					<!-- boowomp -->
					<span class="mx-auto"></span>

					{#if onedit}
						<PlayerButton title="Edit media" key="E" icon={editIcon} onclick={onedit} offset={36} />
					{/if}

					<PlayerSettings
						playbackRate={player.playbackRate}
						onPlaybackRateChange={(playbackRate) => player.setPlaybackRate(playbackRate)}
					/>

					<PlayerButton
						title="Fullscreen"
						icon={fullscreenIcon}
						onclick={() => void onfullscreen()}
						key="F"
						offset={36}
					/>
				</div>
			</div>
		{/if}
	</div>
</section>
