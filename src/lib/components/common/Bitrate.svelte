<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let bitrate: number;

	const rates = [0, 128, 96, 64, 48, 24, 8];
	const rateSuffixes: any = {
		[96]: 'Optimal',
		[48]: 'Bad',
		[8]: 'Terrible'
	};
	const dispatch = createEventDispatcher();
</script>

<div class="flex flex-col gap-2 h-full select-none">
	<div class="flex flex-wrap items-center gap-2">
		{#each rates as rate}
			<button
				class={`rounded-lg transition-all text-white px-4 py-2 flex gap-2 justify-center items-center active:scale-95 border ${bitrate !== rate ? 'hover:bg-neutral-500/25 border-neutral-500/50' : 'bg-violet-700 border-violet-300/50'}`}
				on:click={() => {
					if (rate !== bitrate) dispatch('set', rate);
				}}
			>
				{rate === 0 ? 'Original' : `${rate}k`}
				{rateSuffixes[rate] ? ` (${rateSuffixes[rate]})` : ''}
			</button>
		{/each}
	</div>
</div>
