<script lang="ts">
	import { onDestroy } from 'svelte';
	import { createTrimRange, expandTrimRangeToTime, stepTimelineTime } from '$lib/editing';
	import type { EditorSession } from './editor-session.svelte';
	import TimelinePreview from './TimelinePreview.svelte';

	type Handle = 'start' | 'end';

	let { session }: { session: EditorSession } = $props();

	let player = $derived(session.player);
	let trim = $derived(session.trim);
	let timeline = $state<HTMLDivElement>();
	let dragging = $state<Handle | null>(null);
	let hoveredTime = $state<number | null>(null);
	let resumeAfterScrub = false;
	let bounds = $derived(session.timelineBounds);
	let startPosition = $derived(toPosition(trim?.start ?? bounds.start));
	let endPosition = $derived(toPosition(trim?.end ?? bounds.end));
	let playheadPosition = $derived(toPosition(player.currentTime));

	function toPosition(time: number) {
		return player.duration > 0 ? ((time - player.startTime) / player.duration) * 100 : 0;
	}

	function timeFromClientX(clientX: number) {
		if (!timeline) return bounds.start;
		const box = timeline.getBoundingClientRect();
		const fraction = box.width > 0 ? (clientX - box.left) / box.width : 0;
		return player.startTime + Math.max(0, Math.min(fraction, 1)) * player.duration;
	}

	function updateHandle(handle: Handle, time: number) {
		if (!trim) return;
		const next =
			handle === 'start'
				? createTrimRange({ start: bounds.start, end: trim.end }, time, trim.end)
				: createTrimRange({ start: trim.start, end: bounds.end }, trim.start, time);
		session.updateTrim(next);
		player.previewScrub(handle === 'start' ? next.start : next.end);
	}

	function startHandleDrag(event: PointerEvent, handle: Handle) {
		if (event.button !== 0) return;
		dragging = handle;
		resumeAfterScrub = player.beginScrub();
		if (event.currentTarget instanceof HTMLElement) {
			event.currentTarget.setPointerCapture(event.pointerId);
		}
		updateHandle(handle, timeFromClientX(event.clientX));
	}

	function moveHandle(event: PointerEvent) {
		if (!dragging) return;
		updateHandle(dragging, timeFromClientX(event.clientX));
	}

	function finishHandleDrag(event: PointerEvent) {
		if (!dragging || !trim) return;
		const handle = dragging;
		const time = timeFromClientX(event.clientX);
		const next =
			handle === 'start'
				? createTrimRange({ start: bounds.start, end: trim.end }, time, trim.end)
				: createTrimRange({ start: trim.start, end: bounds.end }, trim.start, time);
		session.updateTrim(next);
		dragging = null;
		void player.endScrub(handle === 'start' ? next.start : next.end, resumeAfterScrub);
		resumeAfterScrub = false;
	}

	function cancelHandleDrag() {
		const handle = dragging;
		if (!handle || !trim) return;
		dragging = null;
		const time = handle === 'start' ? trim.start : trim.end;
		void player.endScrub(time, resumeAfterScrub);
		resumeAfterScrub = false;
	}

	onDestroy(cancelHandleDrag);

	function handleHandleKeydown(event: KeyboardEvent, handle: Handle) {
		if (!trim) return;
		const step = Math.max(0.01, player.duration / 100);
		let nextTime: number;
		if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
			nextTime = (handle === 'start' ? trim.start : trim.end) - step;
		} else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
			nextTime = (handle === 'start' ? trim.start : trim.end) + step;
		} else if (event.key === 'Home') {
			nextTime = handle === 'start' ? bounds.start : trim.start;
		} else if (event.key === 'End') {
			nextTime = handle === 'start' ? trim.end : bounds.end;
		} else {
			return;
		}

		event.preventDefault();
		const next =
			handle === 'start'
				? createTrimRange({ start: bounds.start, end: trim.end }, nextTime, trim.end)
				: createTrimRange({ start: trim.start, end: bounds.end }, trim.start, nextTime);
		session.updateTrim(next);
		void player.seek(handle === 'start' ? next.start : next.end);
	}

	function handleTimelineMove(event: PointerEvent) {
		if (dragging) return;
		hoveredTime = timeFromClientX(event.clientX);
	}

	function handleTimelineClick(event: MouseEvent) {
		if (event.detail === 0 || !trim) return;
		const time = timeFromClientX(event.clientX);
		session.updateTrim(expandTrimRangeToTime(bounds, trim, time));
		void player.seek(time);
	}

	function handleTimelineKeydown(event: KeyboardEvent) {
		if (event.code === 'Space') {
			event.preventDefault();
			void player.togglePlayback();
			return;
		}

		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
		event.preventDefault();
		void player.seek(
			stepTimelineTime(bounds, player.currentTime, event.key === 'ArrowLeft' ? -1 : 1)
		);
	}
</script>

{#if trim}
	<div
		class="relative h-10 w-full touch-none overflow-visible select-none sm:h-18"
		role="presentation"
		bind:this={timeline}
		onpointermove={handleTimelineMove}
		onpointerleave={() => (hoveredTime = null)}
	>
		<button
			type="button"
			class="absolute inset-0 overflow-hidden rounded-sm text-left ring-violet-200 outline-none focus-visible:ring-2"
			aria-label="Seek timeline"
			onclick={handleTimelineClick}
			onkeydown={handleTimelineKeydown}
		>
			<TimelinePreview {player} />
		</button>

		<div
			class="pointer-events-none absolute inset-y-0 left-0 bg-black/70"
			style:width={`${startPosition}%`}
		></div>
		<div
			class="pointer-events-none absolute inset-y-0 right-0 bg-black/70"
			style:width={`${100 - endPosition}%`}
		></div>

		{#if hoveredTime !== null && !dragging}
			<div
				class="pointer-events-none absolute inset-y-0 z-10 w-px bg-white/40"
				style:left={`${toPosition(hoveredTime)}%`}
			>
				<span
					class="absolute bottom-full left-1/2 -translate-x-1/2 px-1 pb-1 text-[0.6875rem] text-neutral-300 tabular-nums"
				>
					{player.formatTimestamp(hoveredTime)}
				</span>
			</div>
		{/if}

		<div
			class="pointer-events-none absolute inset-y-0 z-20 w-px bg-white"
			style:left={`${playheadPosition}%`}
		>
			<span
				class="absolute bottom-full left-1/2 -translate-x-1/2 rounded-sm bg-white px-1 py-0.5 text-[0.6875rem] font-bold text-black tabular-nums"
			>
				{player.formatTimestamp(player.currentTime)}
			</span>
		</div>

		{#each ['start', 'end'] as handle (handle)}
			{@const isStart = handle === 'start'}
			{@const value = isStart ? trim.start : trim.end}
			<button
				type="button"
				class={[
					'absolute inset-y-0 z-30 w-10 -translate-x-1/2 cursor-ew-resize touch-none outline-none after:absolute after:inset-y-0 after:left-1/2 after:w-1.5 after:-translate-x-1/2 after:bg-violet-500 focus-visible:after:ring-4 focus-visible:after:ring-violet-200/50',
					isStart ? 'after:rounded-l-sm' : 'after:rounded-r-sm'
				]}
				style:left={`${isStart ? startPosition : endPosition}%`}
				aria-label={isStart ? 'Trim start' : 'Trim end'}
				aria-valuemin={isStart ? bounds.start : trim.start}
				aria-valuemax={isStart ? trim.end : bounds.end}
				aria-valuenow={value}
				aria-valuetext={player.formatTimestamp(value)}
				role="slider"
				onpointerdown={(event) => startHandleDrag(event, isStart ? 'start' : 'end')}
				onpointermove={moveHandle}
				onpointerup={finishHandleDrag}
				onpointercancel={cancelHandleDrag}
				onkeydown={(event) => handleHandleKeydown(event, isStart ? 'start' : 'end')}
			></button>
		{/each}
	</div>
{/if}
