<script lang="ts">
	import Icon from '@iconify/svelte';
	import pinIcon from '@iconify-icons/mdi/map-marker';
	import TimeInputPart from './TimeInputPart.svelte';
	import { createEventDispatcher } from 'svelte';

	export let value: number;
	export let min = 0;
	export let max = Infinity;
	export let largestPossible: number | undefined = undefined;
	export let currentTimeButton = true;
	const dispatch = createEventDispatcher();

	$: days = Math.trunc(value / 86400);
	$: hours = Math.trunc(value / 3600 % 24);
	$: minutes = Math.trunc(value / 60 % 60);
	$: seconds = value % 60;

	$: maxDays = Math.trunc(max / 86400);
	$: maxHours = Math.trunc(max / 3600 % 24);
	$: maxMinutes = Math.trunc(max / 60 % 60);
	$: maxSeconds = max % 60;

	$: minDays = Math.trunc(min / 86400);
	$: minHours = Math.trunc(min / 3600 % 24);
	$: minMinutes = Math.trunc(min / 60 % 60);
	$: minSeconds = min % 60;

	$: largest = largestPossible ?? isFinite(max) ? max : value;
	$: showHours = largest >= 3600;

	function combineNumber(parts: Record<string, number>) {
		return (parts.second ?? seconds) + (parts.minute ?? minutes) * 60 + (parts.hour ?? hours) * 3600 + (parts.day ?? days) * 86400;
	}

	function update(part: string, value: number) {
		dispatch('set', Math.min(Math.max(combineNumber({ [part]: value }), min), max));
	}
</script>

<div class="flex items-center gap-1 rounded bg-neutral-900 px-4 py-2 text-neutral-200 font-mono">
	<div class="flex">
		{#if showHours}
			<TimeInputPart
				value={hours}
				noPad
				min={days === minDays ? minHours : 0}
				max={days >= maxDays ? maxHours : 24}
				on:set={(e) => update('hour', e.detail)}
			/>
			<span>:</span>
		{/if}
		<TimeInputPart
			value={minutes}
			noPad={!showHours}
			min={hours === minHours ? minMinutes : 0}
			max={hours >= maxHours ? maxMinutes : undefined}
			on:set={(e) => update('minute', e.detail)}
		/>
		<span>:</span>
		<TimeInputPart
			value={seconds}
			seconds
			min={minutes === minMinutes ? minSeconds : 0}
			max={minutes >= maxMinutes ? maxSeconds : undefined}
			on:set={(e) => update('second', e.detail)}
		/>
	</div>
	{#if currentTimeButton}
		<button
			title="Set to current time"
			class="transition-colors w-6 h-6 flex justify-center items-center text-white hover:text-violet-400"
			on:click={() => dispatch('usecurrenttime')}
		>
			<Icon icon={pinIcon} class="w-5 h-5" />
		</button>
	{/if}
</div>
