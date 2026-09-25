<script lang="ts" module>
	export type EditorToolId = 'trim' | 'crop';
</script>

<script lang="ts">
	import contentCutIcon from '@iconify-icons/mdi/content-cut';
	import cropIcon from '@iconify-icons/mdi/crop';
	import fullscreenIcon from '@iconify-icons/mdi/fullscreen';
	import restartIcon from '@iconify-icons/mdi/restart';
	import type { CropRectangle } from 'mediabunny';
	import {
		createCropRectangle,
		createTrimRange,
		isFullFrameCrop,
		isFullTrimRange,
		type CatcutConversionOptions,
		type TimelineRange
	} from '$lib/editing';
	import type { PlayerState } from '$lib/player-state.svelte';
	import PlayerButton from '../PlayerButton.svelte';
	import PlayerPlayButton from '../PlayerPlayButton.svelte';
	import PlayerVolumeControl from '../PlayerVolumeControl.svelte';
	import EditorTabs, { type EditorTab } from './EditorTabs.svelte';
	import EditorTimeline from './EditorTimeline.svelte';
	import CropControls from './tools/CropControls.svelte';
	import TrimControls from './tools/TrimControls.svelte';

	const toolDefinitions = [
		{ id: 'trim', label: 'Trim', icon: contentCutIcon, requiresVideo: false },
		{ id: 'crop', label: 'Crop', icon: cropIcon, requiresVideo: true }
	] satisfies readonly (Omit<EditorTab<EditorToolId>, 'changed'> & { requiresVideo: boolean })[];

	let {
		player,
		options = $bindable<CatcutConversionOptions>({}),
		activeTool = $bindable<EditorToolId>('trim'),
		crop,
		oncropchange,
		onfullscreen
	}: {
		player: PlayerState;
		options?: CatcutConversionOptions;
		activeTool?: EditorToolId;
		crop: CropRectangle | null;
		oncropchange: (crop: CropRectangle) => void;
		onfullscreen: () => void;
	} = $props();

	let trim = $state<TimelineRange>({ start: 0, end: 0 });
	let trimInitialized = $state(false);
	let toolChanges = $derived<Record<EditorToolId, boolean>>({
		trim:
			trimInitialized && !isFullTrimRange({ start: player.startTime, end: player.endTime }, trim),
		crop: Boolean(player.videoSize && crop && !isFullFrameCrop(player.videoSize, crop))
	});
	let tabs = $derived(
		toolDefinitions
			.filter((tool) => !tool.requiresVideo || player.hasVideo)
			.map((tool) => ({ ...tool, changed: toolChanges[tool.id] }))
	);

	$effect(() => {
		if (player.loadState.status !== 'ready' || trimInitialized) return;
		updateTrim(
			createTrimRange(
				{ start: player.startTime, end: player.endTime },
				options.trim?.start,
				options.trim?.end
			)
		);
		trimInitialized = true;
	});

	$effect(() => {
		if (!trimInitialized || player.paused || player.currentTime <= trim.end) return;
		player.pause();
		void player.seek(trim.end);
	});

	async function togglePlayback() {
		if (player.paused && (player.currentTime < trim.start || player.currentTime >= trim.end)) {
			await player.seek(trim.start);
		}
		await player.togglePlayback();
	}

	function revertSettings() {
		updateTrim(createTrimRange({ start: player.startTime, end: player.endTime }));
		if (player.videoSize) oncropchange(createCropRectangle(player.videoSize));
	}

	function updateTrim(nextTrim: TimelineRange) {
		trim = nextTrim;
		options = {
			...options,
			trim: isFullTrimRange({ start: player.startTime, end: player.endTime }, nextTrim)
				? undefined
				: $state.snapshot(nextTrim)
		};
	}
</script>

<section
	class="relative grid h-full w-full min-w-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden border-t border-white/10 bg-neutral-950 px-3 pb-[max(0.5rem,var(--saib))] sm:px-5"
	aria-label="Editing controls"
>
	<div
		class="flex min-h-11 items-center gap-3 text-sm text-neutral-200"
		role="group"
		aria-label="Playback controls"
	>
		<PlayerPlayButton {player} offset={32} onclick={() => void togglePlayback()} />
		<PlayerVolumeControl {player} offset={32} />
		<span class="text-neutral-300 tabular-nums">
			<span class="font-medium text-neutral-100">{player.formatTimestamp(player.currentTime)}</span>
			/ {player.formatTimestamp(player.endTime)}
		</span>
		<span class="mx-auto"></span>
		<PlayerButton
			title="Revert all changes"
			icon={restartIcon}
			onclick={revertSettings}
			disabled={!trimInitialized || (!toolChanges.trim && !toolChanges.crop)}
			offset={32}
		/>
		<PlayerButton
			title="Fullscreen"
			icon={fullscreenIcon}
			onclick={onfullscreen}
			key="F"
			offset={32}
		/>
	</div>

	<div class="pt-4 pb-1 sm:pt-5 sm:pb-2">
		{#if trimInitialized}
			<EditorTimeline {player} {trim} ontrimchange={updateTrim} />
		{:else}
			<div class="h-10 animate-pulse bg-neutral-900 sm:h-18"></div>
		{/if}
	</div>

	<div class="relative min-h-0 w-full min-w-0 overflow-hidden">
		<div class="w-full min-w-0 overflow-x-auto overscroll-x-contain">
			{#if activeTool === 'trim' && trimInitialized}
				<TrimControls {player} {trim} ontrimchange={updateTrim} />
			{:else if activeTool === 'crop' && crop && player.videoSize}
				<CropControls bounds={player.videoSize} {crop} {oncropchange} />
			{/if}
		</div>
		<EditorTabs {tabs} active={activeTool} onselect={(tool) => (activeTool = tool)} />
	</div>
</section>
