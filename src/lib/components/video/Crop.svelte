<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let cropX: number;
	export let cropY: number;
	export let cropWidth: number;
	export let cropHeight: number;
	export let videoWidth: number;
	export let videoHeight: number;

	const dispatch = createEventDispatcher();

	function onChange(prop: 'x' | 'y' | 'w' | 'h') {
		// 'as any' the function cause of inconsistent types n such
		return ((e: Event & { target: EventTarget & HTMLInputElement }) => {
			const newValue = e.target.valueAsNumber;
			if (parseInt(e.target.min) > newValue) dispatch('set', { [prop]: parseInt(e.target.min) })
			else if (parseInt(e.target.max) < newValue) dispatch('set', { [prop]: parseInt(e.target.max) })
			else dispatch('set', { [prop]: newValue });
		}) as any;
	}
</script>

<div class="flex flex-col md:flex-row md:justify-between items-center gap-4 md:text-xl h-full">
	<div class="flex flex-wrap items-center md:gap-4 gap-4 w-full">
		<div class="flex rounded bg-neutral-900 text-neutral-200 overflow-hidden md:w-40 w-[calc(50%-8px)]">
			<label for="crop-x" class="px-4 py-2 bg-neutral-700 font-bold flex-none w-12 text-center">X</label>
			<input
				id="crop-x"
				type="number"
				class="px-4 py-2 bg-transparent outline-none w-full"
				min={0}
				max={videoWidth - cropWidth}
				value={cropX}
				on:change={onChange('x')}
			/>
		</div>
		<div class="flex rounded bg-neutral-900 text-neutral-200 overflow-hidden md:w-40 w-[calc(50%-8px)]">
			<label for="crop-y" class="px-4 py-2 bg-neutral-700 font-bold flex-none w-12 text-center">Y</label>
			<input
				id="crop-y"
				type="number"
				class="px-4 py-2 bg-transparent outline-none w-full"
				min={0}
				max={videoHeight - cropHeight}
				value={cropY}
				on:change={onChange('y')}
			/>
		</div>
		<div class="flex rounded bg-neutral-900 text-neutral-200 overflow-hidden md:w-40 w-[calc(50%-8px)]">
			<label for="crop-w" class="px-4 py-2 bg-neutral-700 font-bold flex-none w-12 text-center">W</label>
			<input
				id="crop-w"
				type="number"
				class="px-4 py-2 bg-transparent outline-none w-full"
				min={1}
				max={videoWidth - cropX}
				value={cropWidth}
				on:change={onChange('w')}
			/>
		</div>
		<div class="flex rounded bg-neutral-900 text-neutral-200 overflow-hidden md:w-40 w-[calc(50%-8px)]">
			<label for="crop-h" class="px-4 py-2 bg-neutral-700 font-bold flex-none w-12 text-center">H</label>
			<input
				id="crop-h"
				type="number"
				class="px-4 py-2 bg-transparent outline-none w-full"
				min={1}
				max={videoHeight - cropY}
				value={cropHeight}
				on:change={onChange('h')}
			/>
		</div>
	</div>
	<div class="text-base">
		<button
			class="font-bold enabled:hover:underline enabled:text-white px-5 py-2 transition-all"
			disabled={cropX === 0 && cropY === 0 && cropWidth === videoWidth && cropHeight === videoHeight}
			on:click={() => dispatch('set', { x: 0, y: 0, w: videoWidth, h: videoHeight })}
		>
			Reset
		</button>
	</div>
</div>
