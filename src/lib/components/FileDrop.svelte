<script lang="ts">
	import Icon from '@iconify/svelte';
	import uploadIcon from '@iconify-icons/mdi/file-upload-outline';
	import { createLocalMediaSource, type LocalMediaSource } from '#lib/store.svelte.js';
	import { mobile } from '#lib/platform.svelte.ts';

	let {
		dragging = false,
		multiple = true,
		hint = 'supports video & audio files',
		pick,
		onselect
	}: {
		dragging?: boolean;
		multiple?: boolean;
		hint?: string;
		pick?: () => void;
		onselect: (sources: LocalMediaSource[]) => void;
	} = $props();

	let noun = $derived(multiple ? 'files' : 'a file');

	function handleClick(event: MouseEvent) {
		if (!pick) return;
		event.preventDefault();
		pick();
	}

	function handleChange(event: Event) {
		if (!(event.currentTarget instanceof HTMLInputElement)) return;
		const files = [...(event.currentTarget.files ?? [])];
		event.currentTarget.value = '';
		if (files.length) onselect(files.map(createLocalMediaSource));
	}
</script>

<label
	class={[
		'has-[input:focus-visible]:ring-accent/35 relative flex w-full max-w-96 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed text-center text-neutral-100 transition-[min-height,background-color,border-color,transform] duration-150 ease-out hover:border-neutral-400 hover:bg-neutral-700 has-[input:focus-visible]:border-neutral-400 has-[input:focus-visible]:bg-neutral-700 has-[input:focus-visible]:ring-3',
		dragging
			? 'min-h-32 scale-[1.01] border-violet-500 bg-violet-900'
			: 'min-h-26 border-neutral-600 bg-neutral-800'
	]}
>
	<input
		class="absolute size-px overflow-hidden whitespace-nowrap [clip-path:inset(50%)]"
		type="file"
		{multiple}
		accept="audio/*,video/*"
		onclick={handleClick}
		onchange={handleChange}
	/>
	<span
		class={[
			'pointer-events-none flex flex-col items-center gap-1 p-4',
			dragging ? 'text-violet-200' : 'text-neutral-400'
		]}
	>
		<Icon class="size-7 text-violet-400" icon={uploadIcon} aria-hidden="true" />
		<span class="text-white"
			>{dragging
				? multiple
					? 'drop them here!'
					: 'drop it here!'
				: mobile.current
					? `select ${noun}`
					: `drag or select ${noun}`}</span
		>
		<small class="max-w-80 text-xs">{hint}</small>
	</span>
</label>
