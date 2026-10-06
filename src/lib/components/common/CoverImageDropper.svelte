<script lang="ts">
	import Icon from '@iconify/svelte';
	import editIcon from '@iconify-icons/mdi/image-edit-outline';
	import downloadIcon from '@iconify-icons/mdi/download';
	import deleteIcon from '@iconify-icons/mdi/delete-outline';
	import revertIcon from '@iconify-icons/mdi/restore';
	import type { IconifyIcon } from '@iconify/svelte';
	import { Tooltip } from 'bits-ui';
	import SmallTooltipContent from './SmallTooltipContent.svelte';

	let {
		src = null,
		alt = 'Cover image',
		onselect,
		changed = false,
		ondelete,
		onrevert
	}: {
		src?: string | null;
		alt?: string;
		onselect?: (file: File) => void;
		changed?: boolean;
		ondelete?: () => void;
		onrevert?: () => void;
	} = $props();

	let input = $state<HTMLInputElement | null>(null);
	let dragging = $state(false);

	function isImageDrag(dataTransfer: DataTransfer | null) {
		if (!dataTransfer?.types.includes('Files')) return false;

		const fileItems = [...dataTransfer.items].filter((item) => item.kind === 'file');
		return fileItems.length === 0 || fileItems.some((item) => item.type.startsWith('image/'));
	}

	function emit(file: File | undefined | null) {
		if (file?.type.startsWith('image/')) onselect?.(file);
	}

	function handleDrag(event: DragEvent) {
		if (!isImageDrag(event.dataTransfer)) return;

		event.preventDefault();
		dragging = true;
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
	}

	function handleDragLeave(event: DragEvent) {
		if (event.relatedTarget === null) dragging = false;
	}

	function handleDrop(event: DragEvent) {
		if (!isImageDrag(event.dataTransfer)) return;

		event.preventDefault();
		dragging = false;

		emit([...(event.dataTransfer?.files ?? [])].find((item) => item.type.startsWith('image/')));
	}

	function handleChange() {
		emit(input?.files?.[0]);
		if (input) input.value = '';
	}
</script>

{#snippet action(icon: IconifyIcon, label: string, hover: string, onclick: () => void)}
	<Tooltip.Root delayDuration={200} disableHoverableContent>
		<Tooltip.Trigger aria-label={label}>
			{#snippet child({ props })}
				<button
					type="button"
					class="flex cursor-pointer items-center justify-center rounded-md bg-neutral-800 p-2 text-neutral-300 transition-colors focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:outline-none {hover}"
					{...props}
					{onclick}
				>
					<Icon {icon} class="size-5" aria-hidden="true" />
				</button>
			{/snippet}
		</Tooltip.Trigger>
		<SmallTooltipContent offset={8}>{label}</SmallTooltipContent>
	</Tooltip.Root>
{/snippet}

<div class="flex w-full max-w-64 flex-col gap-3">
	<input bind:this={input} type="file" accept="image/*" class="hidden" onchange={handleChange} />

	{#if src}
		<button
			type="button"
			aria-label="Replace cover"
			class="w-full cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:outline-none"
			onclick={() => input?.click()}
			ondragenter={handleDrag}
			ondragover={handleDrag}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
		>
			<img
				class={[
					'aspect-square w-full rounded-lg border-2 object-cover',
					changed ? 'border-orange-400 ring-1 ring-orange-400' : 'border-white/10'
				]}
				{src}
				{alt}
			/>
		</button>
	{:else}
		<button
			type="button"
			aria-label="drop image here or click to add"
			class={[
				'flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-neutral-400 transition-colors focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:outline-none',
				changed
					? 'border-orange-400 bg-neutral-800'
					: dragging
						? 'border-neutral-400 bg-neutral-700/60 text-white'
						: 'border-neutral-600 bg-neutral-800 hover:border-neutral-500 hover:bg-neutral-700/40 hover:text-neutral-200'
			]}
			ondragenter={handleDrag}
			ondragover={handleDrag}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			onclick={() => input?.click()}
		>
			<Icon icon={editIcon} class="size-8" aria-hidden="true" />
			<span class="text-xs">drop image here or click to add</span>
		</button>
	{/if}
	{#if src || (changed && onrevert)}
		<div class="grid auto-cols-fr grid-flow-col gap-2">
			{#if src}
				{@render action(editIcon, 'Edit cover', 'hover:bg-neutral-700 hover:text-white', () =>
					input?.click()
				)}
				<Tooltip.Root delayDuration={200} disableHoverableContent>
					<Tooltip.Trigger aria-label="Download cover">
						{#snippet child({ props })}
							<!-- eslint-disable svelte/no-navigation-without-resolve -->
							<a
								href={src}
								download="cover"
								class="flex items-center justify-center rounded-md bg-neutral-800 p-2 text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:outline-none"
								{...props}>
								<Icon icon={downloadIcon} class="size-5" aria-hidden="true" />
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						{/snippet}
					</Tooltip.Trigger>
					<SmallTooltipContent offset={8}>Download cover</SmallTooltipContent>
				</Tooltip.Root>
				{@render action(deleteIcon, 'Delete cover', 'hover:bg-red-900/60 hover:text-red-300', () =>
					ondelete?.()
				)}
			{/if}
			{#if changed && onrevert}
				{@render action(
					revertIcon,
					'Revert cover',
					'hover:bg-neutral-700 hover:text-white',
					onrevert
				)}
			{/if}
		</div>
	{/if}
</div>
