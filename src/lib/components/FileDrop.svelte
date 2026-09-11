<script lang="ts">
	import Icon from '@iconify/svelte';
	import uploadIcon from '@iconify-icons/mdi/file-upload-outline';
	import { createLocalMediaSource, type LocalMediaSource } from '$lib/media';

	let {
		dragging = false,
		onselect
	}: { dragging?: boolean; onselect: (source: LocalMediaSource) => void } = $props();

	function select(file: File | null) {
		if (!file) return;
		onselect(createLocalMediaSource(file));
	}

	function handleChange(event: Event) {
		if (!(event.currentTarget instanceof HTMLInputElement)) return;
		select(event.currentTarget.files?.item(0) ?? null);
	}
</script>

<label
	class={[
		'relative flex w-full max-w-96 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed text-center text-neutral-100 transition-[min-height,background-color,border-color,transform] duration-150 ease-out hover:border-neutral-400 hover:bg-neutral-700 has-[input:focus-visible]:border-neutral-400 has-[input:focus-visible]:bg-neutral-700 has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-violet-500/35',
		dragging
			? 'min-h-32 scale-[1.01] border-violet-500 bg-violet-900'
			: 'min-h-26 border-neutral-600 bg-neutral-800'
	]}
>
	<input
		class="absolute size-px overflow-hidden whitespace-nowrap [clip-path:inset(50%)]"
		type="file"
		accept="audio/*,video/*"
		onchange={handleChange}
	/>
	<span
		class={[
			'pointer-events-none flex flex-col items-center gap-1 p-4',
			dragging ? 'text-violet-200' : 'text-neutral-400'
		]}
	>
		<Icon class="size-7 text-violet-400" icon={uploadIcon} aria-hidden="true" />
		<span class="text-white">{dragging ? 'drop it here!' : 'drag or select a file'}</span>
		<small class="max-w-80 overflow-hidden text-xs text-ellipsis whitespace-nowrap">
			or drag and drop one here
		</small>
	</span>
</label>
