<script lang="ts">
	import { createEventDispatcher } from 'svelte';

    export let resizeWidth: number;
    export let resizeHeight: number;

	const dispatch = createEventDispatcher();

	function onChange(prop: 'w' | 'h') {
		return ((e: Event & { target: EventTarget & HTMLInputElement }) => {
			const newValue = e.target.valueAsNumber;
			if (parseInt(e.target.min) > newValue) dispatch('set', { [prop]: (parseInt(e.target.min)) })
			else if (parseInt(e.target.max) < newValue) dispatch('set', { [prop]: (parseInt(e.target.max)) })
			else dispatch('set', { [prop]: newValue });
		}) as any;
	}
</script>

<div class="flex flex-col gap-2 h-full select-none">

    <div class="flex flex-col md:flex-row md:justify-between items-center gap-4 md:text-xl h-full">

        <div class="flex flex-wrap items-center md:gap-4 gap-4 w-full">
            <div class="flex rounded bg-neutral-900 text-neutral-200 overflow-hidden md:w-40 w-[calc(50%-8px)]">
                <label for="resize-x" class="px-4 py-2 bg-neutral-700 font-bold flex-none w-12 text-center">W</label>
                <input
                    id="resize-x"
                    type="number"
                    class="px-4 py-2 bg-transparent outline-none w-full"
                    min={0}
                    max={20000}
                    value={resizeWidth}
                    on:change={onChange('w')}
                />
            </div>
            <div class="flex rounded bg-neutral-900 text-neutral-200 overflow-hidden md:w-40 w-[calc(50%-8px)]">
                <label for="resize-y" class="px-4 py-2 bg-neutral-700 font-bold flex-none w-12 text-center">H</label>
                <input
                    id="resize-y"
                    type="number"
                    class="px-4 py-2 bg-transparent outline-none w-full"
                    min={0}
                    max={20000}
                    value={resizeHeight}
                    on:change={onChange('h')}
                />
            </div>
        </div>

        <div class="text-base">
            <button
                class="font-bold enabled:hover:underline enabled:text-white px-5 py-2 transition-all"
                disabled={resizeWidth == -1 && resizeHeight == -1}
                on:click={() => dispatch('set', { w: -1, h: -1 })}
            >
                Reset
            </button>
        </div>
    </div>

    <div>
        Blanks or 0 preserve aspect ratio. Dimensions rounded to the nearest even number on export, if this module is used. Forces the Sample Aspect Ratio to 1 if module used. Applied after cropping.
    </div>
</div>