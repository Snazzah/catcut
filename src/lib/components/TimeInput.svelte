<script lang="ts">
	import pinIcon from '@iconify-icons/mdi/map-marker';
	import Icon from '@iconify/svelte';
	import TimeInputPart from './TimeInputPart.svelte';

	const CLOCK_TIME = /^\s*(?:(\d+):)?(\d{1,2}):(\d{1,2}(?:\.\d+)?)\s*$/;
	const HUMAN_TIME = /^\s*(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+(?:\.\d+)?)s)?\s*$/;

	let {
		value,
		min = 0,
		max = Number.POSITIVE_INFINITY,
		largestPossible,
		label,
		onchange,
		onUseCurrentTime
	}: {
		value: number;
		min?: number;
		max?: number;
		largestPossible?: number;
		label: string;
		onchange: (value: number) => void;
		onUseCurrentTime?: () => void;
	} = $props();

	let resolvedMin = $derived(Number.isFinite(min) ? Math.max(0, min) : 0);
	let resolvedMax = $derived(
		Number.isFinite(max) ? Math.max(resolvedMin, max) : Number.POSITIVE_INFINITY
	);
	let clampedValue = $derived(clamp(value));
	let hours = $derived(Math.trunc(clampedValue / 3600));
	let minutes = $derived(Math.trunc((clampedValue / 60) % 60));
	let seconds = $derived(clampedValue % 60);
	let minHours = $derived(Math.trunc(resolvedMin / 3600));
	let minMinutes = $derived(Math.trunc((resolvedMin / 60) % 60));
	let minSeconds = $derived(resolvedMin % 60);
	let maxHours = $derived(
		Number.isFinite(resolvedMax) ? Math.trunc(resolvedMax / 3600) : Number.POSITIVE_INFINITY
	);
	let maxMinutes = $derived(
		Number.isFinite(resolvedMax) ? Math.trunc((resolvedMax / 60) % 60) : 59
	);
	let maxSeconds = $derived(Number.isFinite(resolvedMax) ? resolvedMax % 60 : 59.99);
	let minuteMin = $derived(hours === minHours ? minMinutes : 0);
	let minuteMax = $derived(hours === maxHours ? maxMinutes : 59);
	let secondMin = $derived(hours === minHours && minutes === minMinutes ? minSeconds : 0);
	let secondMax = $derived(hours === maxHours && minutes === maxMinutes ? maxSeconds : 59.99);
	let largest = $derived(
		largestPossible ?? (Number.isFinite(resolvedMax) ? resolvedMax : clampedValue)
	);
	let showHours = $derived(largest >= 3600);
	let atLowerBound = $derived(clampedValue <= resolvedMin);
	let atUpperBound = $derived(clampedValue >= resolvedMax);

	function clamp(number: number) {
		const finiteNumber = Number.isFinite(number) ? number : resolvedMin;
		return Math.max(resolvedMin, Math.min(finiteNumber, resolvedMax));
	}

	function update(parts: { hour?: number; minute?: number; second?: number }) {
		const next =
			(parts.hour ?? hours) * 3600 + (parts.minute ?? minutes) * 60 + (parts.second ?? seconds);
		onchange(clamp(next));
	}

	function parseTime(text: string) {
		const clockMatch = CLOCK_TIME.exec(text);
		if (clockMatch) {
			return {
				hour: Number(clockMatch[1] ?? 0),
				minute: Number(clockMatch[2]),
				second: Number(clockMatch[3])
			};
		}

		const humanMatch = HUMAN_TIME.exec(text);
		if (!humanMatch || humanMatch.slice(1).every((part) => part === undefined)) return null;
		return {
			hour: Number(humanMatch[1] ?? 0),
			minute: Number(humanMatch[2] ?? 0),
			second: Number(humanMatch[3] ?? 0)
		};
	}

	function handlePaste(text: string) {
		const parsed = parseTime(text);
		if (!parsed) return;
		update({
			hour: Math.max(0, parsed.hour),
			minute: Math.max(0, Math.min(parsed.minute, 59)),
			second: Math.max(0, Math.min(parsed.second, 59.99))
		});
	}

	function snapToBoundary(boundary: 'min' | 'max') {
		onchange(boundary === 'max' ? resolvedMax : resolvedMin);
	}

	function stepPart(
		partValue: number,
		delta: -1 | 1,
		partMin: number,
		partMax: number,
		apply: (value: number) => void
	) {
		const next = partValue + delta;
		if (next > partMax) {
			snapToBoundary('max');
			return;
		}
		if (next < partMin) {
			snapToBoundary('min');
			return;
		}
		apply(next);
	}
</script>

<div
	class="flex h-9 shrink-0 items-center gap-1 rounded-sm border border-neutral-600 bg-neutral-950 px-2 text-neutral-200 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-400/30 sm:px-2"
	role="group"
	aria-label={label}
>
	<div class="flex items-center">
		{#if showHours}
			<TimeInputPart
				value={hours}
				label={`${label} hours`}
				noPad
				min={minHours}
				max={maxHours}
				onchange={(hour) => update({ hour })}
				onpaste={handlePaste}
				onstep={(hour, delta) =>
					stepPart(hour, delta, minHours, maxHours, (next) => update({ hour: next }))}
				{atLowerBound}
				{atUpperBound}
			/>
			<span aria-hidden="true">:</span>
		{/if}
		<TimeInputPart
			value={minutes}
			label={`${label} minutes`}
			noPad={!showHours}
			min={minuteMin}
			max={minuteMax}
			onchange={(minute) => update({ minute })}
			onpaste={handlePaste}
			onstep={(minute, delta) =>
				stepPart(minute, delta, minuteMin, minuteMax, (next) => update({ minute: next }))}
			{atLowerBound}
			{atUpperBound}
		/>
		<span aria-hidden="true">:</span>
		<TimeInputPart
			value={seconds}
			label={`${label} seconds`}
			seconds
			min={secondMin}
			max={secondMax}
			onchange={(second) => update({ second })}
			onpaste={handlePaste}
			onstep={(second, delta) =>
				stepPart(second, delta, secondMin, secondMax, (next) => update({ second: next }))}
			{atLowerBound}
			{atUpperBound}
		/>
	</div>

	{#if onUseCurrentTime}
		<button
			type="button"
			title="Use playhead"
			aria-label={`Use playhead for ${label.toLowerCase()}`}
			class="hidden size-7 shrink-0 cursor-pointer place-items-center rounded-sm text-neutral-300 hover:bg-white/10 hover:text-violet-300 focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:outline-none sm:grid"
			onclick={onUseCurrentTime}
		>
			<Icon icon={pinIcon} class="size-4" aria-hidden="true" />
		</button>
	{/if}
</div>
