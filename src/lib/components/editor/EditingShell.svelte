<script lang="ts">
	import contentCutIcon from '@iconify-icons/mdi/content-cut';
	import fullscreenIcon from '@iconify-icons/mdi/fullscreen';
	import restartIcon from '@iconify-icons/mdi/restart';
	import { createTrimRange, type TimelineRange } from '$lib/editing';
	import type { PlayerState } from '$lib/player-state.svelte';
	import PlayerButton from '../PlayerButton.svelte';
	import PlayerPlayButton from '../PlayerPlayButton.svelte';
	import PlayerVolumeControl from '../PlayerVolumeControl.svelte';
	import EditorTabs, { type EditorTab } from './EditorTabs.svelte';
	import EditorTimeline from './EditorTimeline.svelte';
	import TrimControls from './TrimControls.svelte';

	type EditorTabId = 'trim';

	const tabs = [
		{ id: 'trim', label: 'Trim', icon: contentCutIcon }
	] satisfies readonly EditorTab<EditorTabId>[];

	let {
		player,
		onfullscreen
	}: {
		player: PlayerState;
		onfullscreen: () => void;
	} = $props();

	let activeTab = $state<EditorTabId>('trim');
	let trim = $state<TimelineRange>({ start: 0, end: 0 });
	let trimInitialized = $state(false);

	$effect(() => {
		if (player.loadState.status !== 'ready' || trimInitialized) return;
		trim = createTrimRange({ start: player.startTime, end: player.endTime });
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
		trim = createTrimRange({ start: player.startTime, end: player.endTime });
	}
</script>

<section
	class="relative grid h-full grid-rows-[auto_auto_minmax(0,1fr)] border-t border-white/10 bg-neutral-950 px-3 pb-[max(0.5rem,var(--saib))] sm:px-5"
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
			<span class="text-neutral-100 font-medium">{player.formatTimestamp(player.currentTime)}</span> / {player.formatTimestamp(player.endTime)}
		</span>
		<span class="mx-auto"></span>
		<PlayerButton
			title="Revert all changes"
			icon={restartIcon}
			onclick={revertSettings}
			disabled={!trimInitialized ||
				(trim.start === player.startTime && trim.end === player.endTime)}
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
			<EditorTimeline {player} {trim} ontrimchange={(nextTrim) => (trim = nextTrim)} />
		{:else}
			<div class="h-10 animate-pulse bg-neutral-900 sm:h-18"></div>
		{/if}
	</div>

	<div class="relative min-h-0">
		{#if activeTab === 'trim' && trimInitialized}
			<TrimControls {player} {trim} ontrimchange={(nextTrim) => (trim = nextTrim)} />
		{/if}
		<EditorTabs {tabs} active={activeTab} onselect={(tab) => (activeTab = tab)} />
	</div>
</section>
