<script lang="ts">
	import fullscreenIcon from '@iconify-icons/mdi/fullscreen';
	import restartIcon from '@iconify-icons/mdi/restart';
	import PlayerButton from '../PlayerButton.svelte';
	import PlayerPlayButton from '../PlayerPlayButton.svelte';
	import PlayerVolumeControl from '../PlayerVolumeControl.svelte';
	import EditorTabs from './EditorTabs.svelte';
	import EditorTimeline from './EditorTimeline.svelte';
	import type { EditorSession } from './editor-session.svelte';
	import { editorTools, isEditorToolAvailable } from './editor-tools';

	let {
		session,
		onfullscreen
	}: {
		session: EditorSession;
		onfullscreen: () => void;
	} = $props();

	let player = $derived(session.player);
	let availableTools = $derived(editorTools.filter((tool) => isEditorToolAvailable(tool, session)));
	let tabs = $derived(
		availableTools.map((tool) => ({
			id: tool.id,
			label: tool.label,
			icon: tool.icon,
			changed: tool.isChanged(session)
		}))
	);
	let activeDefinition = $derived(
		availableTools.find((tool) => tool.id === session.activeTool) ?? availableTools[0]
	);
	let Controls = $derived(activeDefinition?.controls);
	let playbackRange = $derived(session.trim);
	let hasChanges = $derived(availableTools.some((tool) => tool.isChanged(session)));

	$effect(() => {
		if (activeDefinition && activeDefinition.id !== session.activeTool) {
			session.activeTool = activeDefinition.id;
		}
	});

	$effect(() => {
		if (!playbackRange || player.paused || player.currentTime <= playbackRange.end) return;
		player.pause();
		void player.seek(playbackRange.end);
	});

	async function togglePlayback() {
		if (
			playbackRange &&
			player.paused &&
			(player.currentTime < playbackRange.start || player.currentTime >= playbackRange.end)
		) {
			await player.seek(playbackRange.start);
		}
		await player.togglePlayback();
	}

	function revertSettings() {
		for (const tool of availableTools) tool.reset(session);
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
			disabled={!session.ready || !hasChanges}
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
		{#if session.ready}
			<EditorTimeline {session} />
		{:else}
			<div class="h-10 animate-pulse bg-neutral-900 sm:h-18"></div>
		{/if}
	</div>

	<div class="relative min-h-0 w-full min-w-0 overflow-hidden">
		<div class="w-full min-w-0 overflow-x-auto overscroll-x-contain">
			{#if Controls}
				<Controls {session} />
			{/if}
		</div>
		<EditorTabs
			{tabs}
			active={session.activeTool}
			onselect={(tool) => (session.activeTool = tool)}
		/>
	</div>
</section>
