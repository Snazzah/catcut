<script lang="ts">
	import Icon from '@iconify/svelte';
	import audioIcon from '@iconify-icons/mdi/music-note';
	import videoIcon from '@iconify-icons/mdi/video';
	import { createEventDispatcher } from 'svelte';

	export let toExtension: string | null = null;
	export let extension: string;

	const formats = [
		{ icon: videoIcon, extension: 'mp4' },
		{ icon: videoIcon, extension: 'mkv' },
		{ icon: audioIcon, extension: 'mp3' },
		{ icon: audioIcon, extension: 'wav' }
	];

	const dispatch = createEventDispatcher();
</script>

<div class="flex flex-wrap items-center gap-2 h-full select-none">
	<button
		class={`rounded-lg transition-all text-white px-4 py-2 flex gap-2 justify-center items-center active:scale-95 border ${toExtension !== null ? 'hover:bg-neutral-500/25 border-neutral-500/50' : 'bg-violet-700 border-violet-300/50'}`}
		on:click={() => {
			if (toExtension !== null) dispatch('set', null);
		}}
	>
		Original
	</button>
	{#each formats as format (format.extension)}
		{#if format.extension !== extension}
			<button
				class={`rounded-lg transition-all text-white px-4 py-2 flex gap-2 justify-center items-center active:scale-95 border ${toExtension !== format.extension ? 'hover:bg-neutral-500/25 border-neutral-500/50' : 'bg-violet-700 border-violet-300/50'}`}
				on:click={() => {
					if (toExtension !== format.extension) dispatch('set', format.extension);
				}}
			>
				<Icon icon={format.icon} class="w-6 h-6" />
				<span class="uppercase">{format.extension}</span>
			</button>
		{/if}
	{/each}
</div>
