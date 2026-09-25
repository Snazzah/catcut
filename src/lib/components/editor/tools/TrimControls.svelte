<script lang="ts">
	import { createTrimRange, type TimelineRange } from '$lib/editing';
	import type { PlayerState } from '$lib/player-state.svelte';
	import TimeInput from '$lib/components/TimeInput.svelte';

	let {
		player,
		trim,
		ontrimchange
	}: {
		player: PlayerState;
		trim: TimelineRange;
		ontrimchange: (trim: TimelineRange) => void;
	} = $props();

	let bounds = $derived<TimelineRange>({ start: player.startTime, end: player.endTime });
	let relativeStart = $derived(trim.start - player.startTime);
	let relativeEnd = $derived(trim.end - player.startTime);

	function setStart(seconds: number) {
		ontrimchange(
			createTrimRange({ start: bounds.start, end: trim.end }, player.startTime + seconds, trim.end)
		);
	}

	function setEnd(seconds: number) {
		ontrimchange(
			createTrimRange(
				{ start: trim.start, end: bounds.end },
				trim.start,
				player.startTime + seconds
			)
		);
	}
</script>

<div
	class="flex h-13 w-max min-w-full items-center justify-center gap-1.5 sm:justify-start sm:gap-3"
	role="tabpanel"
>
	<TimeInput
		value={relativeStart}
		min={0}
		max={relativeEnd}
		largestPossible={player.duration}
		label="Trim start"
		onchange={setStart}
		onUseCurrentTime={() => setStart(player.currentTime - player.startTime)}
	/>
	<span class="shrink-0 text-xs text-neutral-500">—</span>
	<TimeInput
		value={relativeEnd}
		min={relativeStart}
		max={player.duration}
		largestPossible={player.duration}
		label="Trim end"
		onchange={setEnd}
		onUseCurrentTime={() => setEnd(player.currentTime - player.startTime)}
	/>
	<span class="hidden shrink-0 text-sm text-neutral-400 tabular-nums md:inline">
		({player.formatDuration(trim.end - trim.start)})
	</span>
</div>
