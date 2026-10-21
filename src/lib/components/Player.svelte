<script lang="ts">
	import { onMount, untrack, type Snippet } from 'svelte';
	import type { PlayerState } from '#lib/player-state.svelte.js';
	import fullscreenIcon from '@iconify-icons/mdi/fullscreen';
	import loadingIcon from '@iconify-icons/mdi/loading';
	import editIcon from '@iconify-icons/mdi/movie-edit-outline';
	import cameraIcon from '@iconify-icons/mdi/camera-outline';
	import previousIcon from '@iconify-icons/mdi/skip-previous';
	import nextIcon from '@iconify-icons/mdi/skip-next';
	import { queue } from '#lib/store.svelte.js';
	import PlayerButton from '#lib/components/common/PlayerButton.svelte';
	import PlayerPlayButton from './PlayerPlayButton.svelte';
	import PlayerSlider from './PlayerSlider.svelte';
	import PlayerSettings from './PlayerSettings.svelte';
	import PlayerVolumeControl from './PlayerVolumeControl.svelte';
	import Icon from '@iconify/svelte';
	import { mobile, narrowViewport, naturallyFullscreen, surfaces } from '#lib/platform.svelte.js';
	import { browser } from '$app/env';
	import { toast } from 'svelte-sonner';

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
	let pipVideo: HTMLVideoElement;
	let pip = $state(false);
	const pipSupported = browser && document.pictureInPictureEnabled;
	let scrubTime = $state<number | null>(null);
	let scrubbing = false;
	let resumeAfterScrub = false;
	let alternateDurationFormat = $state(false);
	let shownTime = $derived(scrubTime ?? player.currentTime);
	let seekStep = $derived(player.duration > 0 ? player.duration / SEEK_STEP_COUNT : 0.001);
	$effect(() => {
		if (player.loadState.status === 'loading')
			untrack(() => {
				scrubTime = null;
				scrubbing = false;
				resumeAfterScrub = false;
			});
	});

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

	// Mirror player state onto the PiP video. play() isn't awaited since the
	// canvas stream only gets frames on draw, so it can hang while we're paused
	$effect(() => {
		if (!pip) return;
		if (player.paused) pipVideo.pause();
		else pipVideo.play().catch(() => {});
	});

	function requestPipFrame() {
		const [track] = (pipVideo.srcObject as MediaStream | null)?.getVideoTracks() ?? [];
		(track as CanvasCaptureMediaStreamTrack | undefined)?.requestFrame();
	}

	// mobile pip works but sucks when its focused out of the page...
	async function togglePip() {
		if (pip) return document.exitPictureInPicture();

		try {
			pipVideo.srcObject ??= canvas.captureStream();

			// wait for metadata
			if (pipVideo.readyState < HTMLMediaElement.HAVE_METADATA) {
				const loaded = new Promise((resolve) =>
					pipVideo.addEventListener('loadedmetadata', resolve, { once: true })
				);
				requestPipFrame();
				await loaded;
			}

			await pipVideo.requestPictureInPicture();
			requestPipFrame();
		} catch (e) {
			console.error('Failed to enter picture-in-picture', e);
			toast.error(`Failed to enter picture-in-picture: ${e}`);
		}
	}

	onMount(() => {
		documentFocused = document.hasFocus();
		player.attachCanvas(canvas);
		// Set the stream up early so metadata is ready when PiP is requested,
		// otherwise waiting on it can outlast the click's user activation
		if (pipSupported) pipVideo.srcObject = canvas.captureStream();

		// Svelte doesn't type these events
		pipVideo.addEventListener('enterpictureinpicture', () => (pip = true));
		pipVideo.addEventListener('leavepictureinpicture', () => {
			pip = false;
			pipVideo.pause();
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
			player.togglePlayback();
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
		player.endScrub(time, shouldResume);
	}

	function downloadFrame() {
		const filename = player.filename.replace(/\.[^.]+$/, '');
		const timestamp = player.currentTime.toFixed(3);
		canvas.toBlob((blob) => {
			if (!blob) return;
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `${filename}-${timestamp}s.png`;
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 300);
		}, 'image/png');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.defaultPrevented) return;

		if (event.target instanceof HTMLElement) {
			if (event.target.closest('[role="slider"]')) {
				if (event.code !== 'Space' && event.code !== 'KeyK') return;
			} else if (
				event.target.closest('button, a, input, select, textarea, [contenteditable="true"]')
			)
				return;
		}

		if (event.code === 'Space' || event.code === 'KeyK') {
			player.togglePlayback();
		} else if (event.code === 'ArrowLeft') {
			player.seek(player.currentTime - 5);
		} else if (event.code === 'ArrowRight') {
			player.seek(player.currentTime + 5);
		} else if (player.paused && (event.code === 'Comma' || event.code === 'Period')) {
			player.stepFrame(event.code === 'Comma' ? -1 : 1);
		} else if (event.code === 'KeyM') {
			player.toggleMuted();
		} else if (event.code === 'KeyP') {
			downloadFrame();
		} else if (event.code === 'KeyF') {
			onfullscreen();
		} else if (event.code === 'KeyE') {
			onedit?.();
		} else if (event.code === 'Escape') {
			onclose();
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
					<h3 class="w-full truncate text-2xl font-bold text-white" title={player.title}>
						{player.title}
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

		<!-- For picture-in-picture -->
		<video
			class="pointer-events-none absolute size-px opacity-0"
			aria-hidden="true"
			muted
			playsinline
			bind:this={pipVideo}
			onplay={() => {
				if (pip) player.play();
			}}
			onpause={() => {
				if (pip) player.pause();
			}}
		></video>

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
					{#if queue.entries.length > 1 && !mobile.current && !narrowViewport.current}
						<PlayerButton
							title="Previous"
							icon={previousIcon}
							onclick={() => {
								const entry = queue.previousEntry;
								if (entry) queue.select(entry.id);
							}}
							disabled={!queue.previousEntry}
							offset={36}
						/>
						<PlayerButton
							title="Next"
							icon={nextIcon}
							onclick={() => {
								const entry = queue.nextEntry;
								if (entry) queue.select(entry.id);
							}}
							disabled={!queue.nextEntry}
							offset={36}
						/>
					{/if}
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

					{#if player.hasVideo}
						<PlayerButton
							title="Screenshot frame"
							key="P"
							icon={cameraIcon}
							onclick={downloadFrame}
							offset={36}
						/>
					{/if}

					<PlayerSettings
						playbackRate={player.playbackRate}
						onPlaybackRateChange={(playbackRate) => player.setPlaybackRate(playbackRate)}
						{pip}
						pipAllowed={pipSupported && player.hasVideo && !mobile.current}
						onPipToggle={() => togglePip()}
					/>

					{#if !naturallyFullscreen.current}
						<PlayerButton
							title="Fullscreen"
							icon={fullscreenIcon}
							onclick={() => onfullscreen()}
							key="F"
							offset={36}
						/>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</section>
