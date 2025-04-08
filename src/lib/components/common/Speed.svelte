<script lang="ts">
	import Icon from '@iconify/svelte';
	import warningIcon from '@iconify-icons/mdi/warning';

	import { createEventDispatcher } from 'svelte';
	import CheckBoxButton from '../CheckBoxButton.svelte';

	export let speedFactor: number;
	export let keepPitch: boolean;
	export let semitoneFactor: number;

	const dispatch = createEventDispatcher();

	function onChange(prop: 's' | 't') {
		// 'as any' the function cause of inconsistent types n such
		return ((e: Event & { target: EventTarget & HTMLInputElement }) => {
			const newValue = e.target.valueAsNumber;
			if (parseInt(e.target.min) > newValue) dispatch('set', { [prop]: parseInt(e.target.min) });
			else if (parseInt(e.target.max) < newValue)
				dispatch('set', { [prop]: parseInt(e.target.max) });
			else dispatch('set', { [prop]: newValue });
		}) as any;
	}
</script>

<div class="flex flex-col gap-2 h-full select-none">
	<div class="flex flex-col md:flex-row md:justify-between items-center gap-4 md:text-xl h-full">
		<div class="flex flex-wrap items-center md:gap-4 gap-4 w-full">
			<div
				class="flex rounded bg-neutral-900 text-neutral-200 overflow-hidden md:w-72 w-[calc(50%-8px)]"
			>
				<label for="speed-factor" class="px-4 py-2 bg-neutral-700 font-bold flex-none text-center"
					>Speed</label
				>
				<input
					id="speed-factor"
					type="number"
					class="px-4 py-2 bg-transparent outline-none w-full no-spinner text-right"
					min={0.001}
					max={100000}
					step={0.001}
					value={speedFactor}
					on:change={onChange('s')}
				/>
				<span class="pr-4 py-2 opacity-50">x</span>
			</div>
			<div
				class="flex rounded bg-neutral-900 text-neutral-200 overflow-hidden md:w-72 w-[calc(50%-8px)]"
			>
				<label
					for="semitone-factor"
					class="px-4 py-2 bg-neutral-700 font-bold flex-none text-center">Pitch</label
				>
				<input
					disabled={!keepPitch}
					id="semitone-factor"
					type="number"
					class={`${!keepPitch ? 'text-gray-500' : ''} px-4 py-2 bg-transparent outline-none w-full no-spinner text-right`}
					min={-60}
					max={60}
					value={keepPitch ? semitoneFactor : (12 * Math.log2(speedFactor ?? 1)).toFixed(3)}
					on:change={onChange('t')}
				/>
				<span class="pr-4 py-2 opacity-50">semitones</span>
			</div>
			<div class="mx-auto md:mx-0">
				<CheckBoxButton
					on:click={() => dispatch('setKeepPitch', !keepPitch)}
					checked={keepPitch}
					info="Maintains the pitch regardless of time stretching, or lets you customize it."
				>
					Maintain Pitch
				</CheckBoxButton>
			</div>
		</div>

		<div class="text-base">
			<button
				class="font-bold enabled:hover:underline enabled:text-white px-5 py-2 transition-all"
				disabled={speedFactor === 1 && semitoneFactor === 0 && !keepPitch}
				on:click={() => {
					dispatch('set', { s: 1, t: 0 });
					dispatch('setKeepPitch', false);
				}}
			>
				Reset
			</button>
		</div>
	</div>
	<div class="p-2 rounded bg-yellow-500/25 text-white sm:text-base text-sm">
		<Icon icon={warningIcon} inline class="inline" />
		Speed changes are not reflected in the preview. This can take very long if the speed is low!
	</div>
</div>
