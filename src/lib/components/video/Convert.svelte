<script lang="ts">
	import Icon from '@iconify/svelte';
	import audioIcon from '@iconify-icons/mdi/music-note';
	import { createEventDispatcher } from 'svelte';

	export let toExtension: string | null = null;

	const formats = [
		{ icon: audioIcon, extension: 'mp3' },
		{ icon: audioIcon, extension: 'wav' }
	];

	const dispatch = createEventDispatcher();
</script>

<div class="flex items-center gap-2 h-full select-none">
	<button
		class={`rounded-lg transition-all text-white px-4 py-2 flex gap-2 justify-center items-center active:scale-95 ${toExtension !== null ? 'hover:bg-neutral-500/25' : 'bg-violet-700'}`}
		on:click={() => {
			if (toExtension !== null) dispatch('set', null);
		}}
	>
		Original
	</button>
	{#each formats as format (format.extension)}
		<button
			class={`rounded-lg transition-all text-white px-4 py-2 flex gap-2 justify-center items-center active:scale-95 ${toExtension !== format.extension ? 'hover:bg-neutral-500/25' : 'bg-violet-700 hover:bg-violet-600'}`}
			on:click={() => {
				if (toExtension !== format.extension) dispatch('set', format.extension);
			}}
		>
			<Icon icon={format.icon} class="w-6 h-6" />
			<span class="uppercase">{format.extension}</span>
		</button>
	{/each}
</div>
