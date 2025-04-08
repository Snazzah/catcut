<script lang="ts">
	import Icon from '@iconify/svelte';
	import muteIcon from '@iconify-icons/mdi/volume-mute';
	import lowVolumeIcon from '@iconify-icons/mdi/volume-medium';
	import volumeIcon from '@iconify-icons/mdi/volume-high';
	import { createEventDispatcher } from 'svelte';

	export let volume: number;
	export let volumeMode: number;
	export let loudnormArgs: number[];
	let tabs = ['Set Volume', 'Normalize Loudness'];
	const loudnormInputs = [
		{
			name: 'Integrated LUFS (Target)',
			id: 'vol-il',
			default: -24,
			min: -70,
			max: -5
		},
		{
			name: 'Loudness Range Target (LRT)',
			id: 'vol-lrt',
			default: 7,
			min: 1,
			max: 50
		},
		{
			name: 'True Peak',
			id: 'vol-tp',
			default: -2,
			min: -9,
			max: 0
		}
	];
	const defaultButtons = [
		['Set Default', [-24, 7, -2]],
		["Use Spotify's Normalization", [-14, 11, -1]]
	];

	const dispatch = createEventDispatcher();
</script>

<div class="flex items-center flex-col gap-4 h-full select-none">
	<div class="flex gap-4 w-full sm:flex-row flex-col">
		{#each tabs as tab, i}
			<button
				class={`rounded-lg transition-all w-full text-sm text-white px-4 py-1 flex gap-2 justify-center items-center active:scale-95 border ${volumeMode !== i ? 'hover:bg-neutral-500/25 border-neutral-500/50' : 'bg-violet-700 border-violet-300/50'}`}
				on:click={() => {
					if (i !== volumeMode) dispatch('setmode', i);
				}}
			>
				{tab}
			</button>
		{/each}
	</div>
	{#if volumeMode === 0}
		<div class="flex items-center gap-4 w-full">
			<div class="flex flex-col justify-center items-center">
				<button
					class="p-1 text-neutral-200 transition-all hover:text-violet-500 active:scale-90 active:text-violet-400"
					on:click={() => dispatch('set', volume === 0 ? 1 : 0)}
				>
					<Icon
						icon={volume === 0 ? muteIcon : volume < 0.75 ? lowVolumeIcon : volumeIcon}
						class="w-8 h-8"
					/>
				</button>
				<span class="text-xs text-white">{Math.round(volume * 100)}%</span>
			</div>
			<div class="flex flex-col w-full relative">
				<input
					class="w-full"
					type="range"
					min="0"
					max="3"
					step="0.1"
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
	{:else if volumeMode === 1}
		<div class="flex flex-col justify-evenly gap-4 w-full">
			{#each loudnormInputs as input, i (input.id)}
				<div class="flex items-center w-full">
					<label for={input.id} class="text-white sm:text-lg w-full">{input.name}</label>
					<input
						type="number"
						id={input.id}
						class="bg-neutral-900 text-center w-24 outline-none transition-all focus:ring focus:ring-violet-500 rounded px-4 py-2 text-neutral-200 flex-none"
						value={loudnormArgs[i]}
						placeholder={`${input.default}`}
						min={input.min}
						max={input.max}
						on:change={(e) => {
							const nextArgs = [...loudnormArgs];
							nextArgs[i] = parseFloat(e.currentTarget.value);
							dispatch('setloudnorm', nextArgs);
						}}
					/>
				</div>
			{/each}
			<div class="flex gap-2">
				{#each defaultButtons as btn}
					<button
						class="rounded-lg transition-all w-full sm:w-auto text-sm text-white px-4 py-1 flex gap-2 justify-center items-center active:scale-95 bg-neutral-700"
						on:click={() => dispatch('setloudnorm', btn[1])}
					>
						{btn[0]}
					</button>
				{/each}
			</div>
			<div class="p-2 rounded bg-violet-500/25 text-white sm:text-base text-sm">
				This uses ffmpeg's 'loudnorm' audio filter to have a more uniform loudness level. The
				default arguments should work well for most people.
			</div>
		</div>
	{/if}
</div>

<style lang="scss">
	input[type='range'] {
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

	input[type='number']::-webkit-inner-spin-button,
	input[type='number']::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
</style>
