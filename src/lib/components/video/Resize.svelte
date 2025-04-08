<script lang="ts">
	import Icon from '@iconify/svelte';
	import infoIcon from '@iconify-icons/mdi/information';
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
			<div class="flex rounded bg-neutral-900 text-neutral-200 overflow-hidden md:w-40 w-[calc(50%-8px)] relative">
				<label for="resize-x" class="px-4 py-2 bg-neutral-700 font-bold flex-none w-12 text-center">W</label>
				<input
					id="resize-x"
					type="number"
					class="px-4 py-2 bg-transparent outline-none w-full peer"
					step={1}
					min={0}
					max={20000}
					value={resizeWidth}
					on:change={onChange('w')}
				/>
				{#if resizeWidth === 0}
					<span class="absolute px-4 py-2 pointer-events-none left-16 text-violet-400/75 opacity-100 peer-active:opacity-0 peer-hover:opacity-0 peer-focus:opacity-0 transition-opacity">(auto)</span>
				{/if}
			</div>
			<div class="flex rounded bg-neutral-900 text-neutral-200 overflow-hidden md:w-40 w-[calc(50%-8px)] relative">
				<label for="resize-y" class="px-4 py-2 bg-neutral-700 font-bold flex-none w-12 text-center">H</label>
				<input
					id="resize-y"
					type="number"
					class="px-4 py-2 bg-transparent outline-none w-full peer"
					min={0}
					max={20000}
					value={resizeHeight}
					on:change={onChange('h')}
				/>
				{#if resizeHeight === 0}
					<span class="absolute px-4 py-2 pointer-events-none left-16 text-violet-400/75 opacity-100 peer-active:opacity-0 peer-hover:opacity-0 peer-focus:opacity-0 transition-opacity">(auto)</span>
				{/if}
			</div>
		</div>

		<div class="text-base">
			<button
				class="font-bold enabled:hover:underline enabled:text-white px-5 py-2 transition-all"
				disabled={resizeWidth == 0 && resizeHeight == 0}
				on:click={() => dispatch('set', { w: 0, h: 0 })}
			>
				Reset
			</button>
		</div>
	</div>
	<div class="p-2 rounded bg-blue-500/25 text-white sm:text-base text-sm">
		<Icon icon={infoIcon} inline class="inline" />
		Setting width or height to 0 will preserve aspect ratio. Dimensions are rounded to the nearest even number. Forces the Sample Aspect Ratio to 1 if module used. Applied after cropping. Effect of resizing does not show in the preview.
	</div>
</div>
