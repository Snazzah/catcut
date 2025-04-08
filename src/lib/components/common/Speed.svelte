<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import CheckBoxButton from '../CheckBoxButton.svelte';

	export let speedFactor: number;
    export let keepPitch: boolean;
    export let semitoneFactor: number;

	const dispatch = createEventDispatcher();

    // I do not trust myself removing the onChange entirely.
	function onChange(prop: 's' | 't') {
		// 'as any' the function cause of inconsistent types n such
		return ((e: Event & { target: EventTarget & HTMLInputElement }) => {
			const newValue = e.target.valueAsNumber;
			if (parseInt(e.target.min) > newValue) dispatch('set', { [prop]: parseInt(e.target.min) })
			else if (parseInt(e.target.max) < newValue) dispatch('set', { [prop]: parseInt(e.target.max) })
			else dispatch('set', { [prop]: newValue });
		}) as any;
	}
</script>
<div class="flex flex-col gap-2 h-full select-none">

    <div class="flex flex-col md:flex-row md:justify-between items-center gap-4 md:text-xl h-full">

        <div class="flex flex-wrap items-center md:gap-4 gap-4 w-full">
            <div class="flex rounded bg-neutral-900 text-neutral-200 overflow-hidden md:w-48">
                <label for="speed-factor" class="px-4 py-2 bg-neutral-700 font-bold flex-none  text-center">SPEED (X)</label>
                <input
                    id="speed-factor"
                    type="number"
                    class="px-4 py-2 bg-transparent outline-none w-full"
                    min={0.001}
                    max={100000}
                    step={0.001}
                    value={speedFactor}
                    on:change={onChange('s')}
                />
            </div>
            <div class="flex rounded bg-neutral-900 text-neutral-200 overflow-hidden md:w-100">
                <label for="semitone-factor" class="px-4 py-2 bg-neutral-700 font-bold flex-none  text-center"> PITCH CHANGE </label>
                <input disabled={!keepPitch}
                    id="semitone-factor"
                    type="number"
                    class={`${!keepPitch ? 'text-gray-500' : ''} px-4 py-2 bg-transparent outline-none w-full`}
                    min={-60}
                    max={60}
                    value={keepPitch ? semitoneFactor : (12 * Math.log2(speedFactor ?? 1)).toFixed(3)}
                    on:change={onChange('t')}
                />
            </div>
            <div class='w-100'>
                <CheckBoxButton 
                on:click={() => dispatch('setKeepPitch', !keepPitch)}
                checked={keepPitch} info="Maintains the pitch regardless of time stretching, or lets you customize it."> Advanced mode / Keep Pitch </CheckBoxButton>
    
            </div>
        </div>

        <div class="text-base">
            <button
                class="font-bold enabled:hover:underline enabled:text-white px-5 py-2 transition-all"
                disabled={speedFactor === 1 && semitoneFactor === 0 && !keepPitch}
                on:click={() => {dispatch('set', { s: 1, t: 0 }); dispatch('setKeepPitch', false)}}
            >
                Reset
            </button>
        </div>
    </div>
    <div>
        Higher = Faster, e.g. 2 means twice as fast. Pitch change is in semitones. Speed changes are not reflected in the preview. WARNING: can take very long if the speed is low!
    </div>
</div>