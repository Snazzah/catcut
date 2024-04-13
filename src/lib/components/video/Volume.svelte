<script lang="ts">
	import Icon from '@iconify/svelte';
	import muteIcon from '@iconify-icons/mdi/volume-mute';
	import lowVolumeIcon from '@iconify-icons/mdi/volume-medium';
	import volumeIcon from '@iconify-icons/mdi/volume-high';
	import { createEventDispatcher } from 'svelte';

	export let volume: number;

	const dispatch = createEventDispatcher();
</script>

<div class="flex items-center gap-4 h-full select-none">
	<div class="flex flex-col justify-center items-center">
		<button
			class="p-1 text-neutral-200 transition-all hover:text-violet-500 active:scale-90 active:text-violet-400"
			on:click={() => dispatch('set', volume === 0 ? 1 : 0)}
		>
			<Icon icon={volume === 0 ? muteIcon : volume < .75 ? lowVolumeIcon : volumeIcon} class="w-8 h-8" />
		</button>
		<span class="text-xs text-white">{Math.round(volume * 100)}%</span>
	</div>
	<div class="flex flex-col w-full relative">
		<input
			class="w-full"
			type="range"
			min="0" max="3" step="0.1"
			bind:value={volume}
			on:change={() => dispatch('set', volume)}
		/>
		<div class="flex justify-between text-sm px-2">
			<span class="w-px h-2 bg-white/50" />
			<span class="w-px h-2 bg-white" />
			<span class="w-px h-2 bg-white/50" />
			<span class="w-px h-2 bg-white/50" />
		</div>
	</div>
</div>

<style lang="scss">
	input[type="range"] {
    background-color: transparent;
    appearance: none;
		@apply bg-neutral-600/50 h-4 overflow-hidden rounded-full cursor-pointer;

		&::-webkit-slider-thumb {
			-webkit-appearance: none;
			@apply w-4 h-4 text-violet-600 bg-white rounded-full cursor-pointer;
			box-shadow: calc(-100vmax - 0.5rem) 0 0 100vmax currentColor;
		}

		&:hover::-webkit-slider-thumb {
			@apply cursor-grab;
		}

		&:active::-webkit-slider-thumb {
			@apply cursor-grabbing;
		}
	}
</style>
