<script lang="ts">
	import Icon from '@iconify/svelte';
	import warningIcon from '@iconify-icons/mdi/warning';
	import { createEventDispatcher } from 'svelte';

	export let compressionLevel: number;

	const levelNames = ['None', 'Optimal', 'High', 'Very High', 'Terrible'];

	const dispatch = createEventDispatcher();
</script>

<div class="flex flex-col gap-2 h-full select-none">
	<div class="flex flex-wrap items-center gap-2">
		{#each levelNames as name, level}
			<button
				class={`rounded-lg transition-all text-white px-4 py-2 flex gap-2 justify-center items-center active:scale-95 border ${compressionLevel !== level ? 'hover:bg-neutral-500/25 border-neutral-500/50' : 'bg-violet-700 border-violet-300/50'}`}
				on:click={() => {
					if (level !== compressionLevel) dispatch('set', level);
				}}
			>
				{name}
			</button>
		{/each}
	</div>
	<div class="p-2 rounded bg-yellow-500/25 text-white sm:text-base text-sm">
		<Icon icon={warningIcon} inline class="inline" />
		Compression takes a long time to process, the higher level of compression means the worse the quality. Most use cases can use 'Optimal'.
	</div>
</div>
