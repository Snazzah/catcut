<script lang="ts">
	import { createTrimRange } from '$lib/editing';
	import TimeInput from '$lib/components/TimeInput.svelte';
	import type { EditorSession } from '../editor-session.svelte';

	let { session }: { session: EditorSession } = $props();

	let player = $derived(session.player);
	let trim = $derived(session.trim);
	let bounds = $derived(session.timelineBounds);
	let relativeStart = $derived(trim ? trim.start - player.startTime : 0);
	let relativeEnd = $derived(trim ? trim.end - player.startTime : 0);

	function setStart(seconds: number) {
		if (!trim) return;
		session.updateTrim(
			createTrimRange({ start: bounds.start, end: trim.end }, player.startTime + seconds, trim.end)
		);
	}

	function setEnd(seconds: number) {
		if (!trim) return;
		session.updateTrim(
			createTrimRange(
				{ start: trim.start, end: bounds.end },
				trim.start,
				player.startTime + seconds
			)
		);
	}
</script>

{#if trim}
	<div
		class="flex h-full w-max min-w-full items-center justify-center gap-1.5 sm:justify-start sm:gap-3"
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
{/if}
