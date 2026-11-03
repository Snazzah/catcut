<script lang="ts">
	import type { PlayerState } from '#lib/player-state.svelte.js';
	import Player from './Player.svelte';
	import PlayerPlayButton from './PlayerPlayButton.svelte';
	import PlayerSlider from './PlayerSlider.svelte';
	import PlayerVolumeControl from './PlayerVolumeControl.svelte';

	const SEEK_STEP_COUNT = 10_000;

	let {
		player,
		onclose,
		disabled = false,
		highlighted = false
	}: {
		player: PlayerState;
		onclose: () => void;
		disabled?: boolean;
		highlighted?: boolean;
	} = $props();

	let scrubTime = $state<number | null>(null);
	let resumeAfterScrub = false;
	let preview = $state<HTMLElement>();
	let ready = $derived(player.loadState.status === 'ready');
	let shownTime = $derived(scrubTime ?? player.currentTime);

	async function toggleFullscreen() {
		if (document.fullscreenElement) await document.exitFullscreen();
		else await preview?.requestFullscreen();
	}
</script>

<div
	class={[
		'overflow-hidden rounded-lg',
		ready && !player.hasVideo ? 'h-32' : 'aspect-video',
		highlighted && 'ring-2 ring-violet-500'
	]}
	bind:this={preview}
>
	<Player {player} {onclose} onfullscreen={toggleFullscreen} showControls={false} compact />
</div>

{#if ready}
	<div class="mt-3 grid gap-1">
		<PlayerSlider
			min={player.startTime}
			max={player.endTime}
			step={player.duration > 0 ? player.duration / SEEK_STEP_COUNT : 0.001}
			value={shownTime}
			{disabled}
			label="Seek"
			onInteractionStart={() => (resumeAfterScrub = player.beginScrub())}
			onValueChange={(time) => {
				scrubTime = time;
				player.previewScrub(time);
			}}
			onValueCommit={(time) => {
				scrubTime = null;
				player.endScrub(time, resumeAfterScrub);
			}}
		/>
		<div class="flex min-h-11 items-center gap-3 text-sm text-neutral-200">
			<PlayerPlayButton {player} />
			<PlayerVolumeControl {player} />
			<span class="text-neutral-300 tabular-nums">
				<span class="font-medium text-neutral-100">{player.formatTimestamp(shownTime)}</span>
				/ {player.formatTimestamp(player.endTime)}
			</span>
		</div>
	</div>
{/if}
