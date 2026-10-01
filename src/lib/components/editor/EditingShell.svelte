<script lang="ts">
	import fullscreenIcon from '@iconify-icons/mdi/fullscreen';
	import restartIcon from '@iconify-icons/mdi/restart';
	import saveIcon from '@iconify-icons/mdi/content-save';
	import crystalBallIcon from '@iconify-icons/mdi/crystal-ball';
	import PlayerButton from '$lib/components/common/PlayerButton.svelte';
	import PlayerPlayButton from '../PlayerPlayButton.svelte';
	import PlayerVolumeControl from '../PlayerVolumeControl.svelte';
	import EditorTabs from './EditorTabs.svelte';
	import EditorTimeline from './EditorTimeline.svelte';
	import type { EditorSession } from './editor-session.svelte';
	import { editorTools, isEditorToolAvailable } from './editor-tools';
	import Icon from '@iconify/svelte';

	let {
		session,
		onfullscreen,
		onsave
	}: {
		session: EditorSession;
		onfullscreen: () => void;
		onsave: () => void;
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
	let conversionProgress = $derived(
		session.saveState.status === 'converting'
			? session.saveState.progress
			: session.saveState.status === 'complete'
				? 1
				: null
	);

	$effect(() => {
		if (activeDefinition && activeDefinition.id !== session.activeTool) {
			session.activeTool = activeDefinition.id;
		}
	});

	$effect(() => {
		player.playbackRange = playbackRange;
		return () => (player.playbackRange = null);
	});

	function revertSettings() {
		for (const tool of availableTools) tool.reset(session);
	}

	function finishSaveAnimation() {
		if (session.saveState.status === 'complete') session.saveState = { status: 'idle' };
	}
</script>

<div class="relative h-full w-full">
	{#if conversionProgress !== null}
		<div
			class="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 bg-neutral-800"
			class:save-complete={session.saveState.status === 'complete'}
			onanimationend={finishSaveAnimation}
			role="progressbar"
			aria-label={session.saveState.status === 'complete'
				? 'Conversion completed'
				: 'Conversion progress'}
			aria-valuemin="0"
			aria-valuemax="100"
			aria-valuenow={Math.floor(conversionProgress * 100)}
		>
			<div
				class={[
					'h-full transition-[background-color,box-shadow] duration-200 motion-reduce:transition-none',
					session.saveState.status === 'complete'
						? 'bg-green-400 shadow-[0_0_6px_#4ade80,0_0_18px_#4ade8080]'
						: 'bg-violet-400 shadow-[0_0_6px_#a78bfa,0_0_18px_#a78bfa80]'
				]}
				style:width={`${conversionProgress * 100}%`}
			></div>
		</div>
	{/if}
	<section
		class={[
			'relative grid h-full w-full min-w-0 overflow-hidden border-t border-white/10 bg-neutral-950 px-3 pb-[max(0.5rem,var(--saib))] sm:px-5',
			session.saving ? 'grid-rows-[auto_minmax(0,1fr)]' : 'grid-rows-[auto_auto_minmax(0,1fr)]'
		]}
		aria-label="Editing controls"
	>
		<div
			class="flex min-h-11 items-center gap-3 text-sm text-neutral-200"
			role="group"
			aria-label="Playback controls"
		>
			<PlayerPlayButton {player} offset={32} />
			<PlayerVolumeControl {player} offset={32} />
			<span class="text-neutral-300 tabular-nums">
				<span class="font-medium text-neutral-100"
					>{player.formatTimestamp(player.currentTime)}</span
				>
				/ {player.formatTimestamp(player.endTime)}
			</span>
			<span class="mx-auto"></span>
			<PlayerButton
				title="Fullscreen"
				icon={fullscreenIcon}
				onclick={onfullscreen}
				key="F"
				offset={32}
			/>
			<span class="h-5 w-px shrink-0 bg-white/20" aria-hidden="true"></span>
			<PlayerButton
				title="Revert all changes"
				icon={restartIcon}
				onclick={revertSettings}
				disabled={!session.ready || !session.hasChanges || session.saving}
				offset={32}
			/>
			<PlayerButton
				title="Save changes"
				icon={saveIcon}
				onclick={onsave}
				disabled={!session.ready || !session.hasChanges || session.saving}
				offset={32}
			/>
		</div>

		{#if session.saveState.status === 'converting'}
			<div class="flex min-h-0 items-center gap-2" aria-label="Conversion progress">
				<Icon icon={crystalBallIcon} class="size-8 text-violet-500" />
				<p
					class="min-w-0 flex-1 text-xl font-medium text-neutral-100 tabular-nums sm:text-2xl"
					role="status"
				>
					<span class="font-bold">Converting</span>: {Math.floor(session.saveState.progress * 100)}%
				</p>
				<button
					class="h-10 shrink-0 cursor-pointer rounded-full bg-neutral-800 px-5 text-sm font-semibold text-neutral-100 transition-colors outline-none hover:bg-white/8 hover:text-white focus-visible:ring-2 focus-visible:ring-violet-200 motion-reduce:transition-none"
					onclick={() => session.cancelSave()}>Cancel</button
				>
			</div>
		{:else}
			<div class="pt-4 pb-1 sm:pt-5 sm:pb-2">
				{#if session.ready}
					<EditorTimeline {session} />
				{:else}
					<div class="h-10 animate-pulse bg-neutral-900 sm:h-18"></div>
				{/if}
			</div>

			<div class="grid min-h-0 w-full min-w-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
				<div class="w-full min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain">
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
		{/if}
	</section>
</div>

<style>
	.save-complete {
		animation: save-complete 1.2s ease-out forwards;
	}

	@keyframes save-complete {
		0%,
		50% {
			opacity: 1;
			filter: brightness(1);
		}
		25% {
			opacity: 1;
			filter: brightness(1.8);
		}
		100% {
			opacity: 0;
			filter: brightness(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.save-complete {
			animation: save-fade 200ms ease-out forwards;
		}
	}

	@keyframes save-fade {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}
</style>
