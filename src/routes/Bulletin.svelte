<script lang="ts">
	import Icon from '@iconify/svelte';
	import Modal from './Modal.svelte';
	import { catcut } from '$lib/icons';
	import { lastBulletin } from '$lib/data';

	let modalOpen = false;

	const updateTitle = 'april 8th: speed, resizing, and this thing!';
	const updateDate = '4/8/2025';
	$: notify = $lastBulletin !== updateDate;
</script>

<button
	class="fixed top-0 left-0 right-0 justify-center items-center py-4 flex gap-2 hover:text-neutral-200 transition-colors"
	class:text-neutral-100={notify}
	on:click={() => {
		modalOpen = true;
		$lastBulletin = updateDate;
	}}
>
	{#if notify}
		<div class="w-3 h-3 rounded-full bg-orange-500 inline-block" />
	{/if}
	<span class="inline-block">{updateTitle}</span>
</button>

<Modal open={modalOpen} on:clickout={() => (modalOpen = false)}>
	<div class="flex flex-col gap-4 m-2">
		<h1>
			<b class="text-violet-500">
				<Icon icon={catcut} class="inline-block" inline />
				catcut
			</b>
			update <span class="text-neutral-400">{updateDate}</span>
		</h1>
		<ul class="list-disc list-inside">
			<li>Added speed/pitch and resize components by @i-winxd (<a class="text-violet-300 hover:text-violet-400 transition-colors" href="https://github.com/Snazzah/catcut/pull/7" target="_blank">#7</a>)</li>
			<li>Added this bulletin board update thingy</li>
			<li>Made it so that failed trims will automatically retry with forced re-encoding</li>
			<li>Miscellaneous tidying up</li>
		</ul>
		<a class="text-violet-300 hover:text-violet-400 transition-colors" href="https://github.com/Snazzah/catcut" target="_blank">View on GitHub</a>
	</div>
</Modal>
