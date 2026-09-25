<script lang="ts">
	import type { CropRectangle } from 'mediabunny';
	import { createCropRectangle, isFullFrameCrop, type VideoSize } from '$lib/editing';

	let {
		bounds,
		crop,
		oncropchange
	}: {
		bounds: VideoSize;
		crop: CropRectangle;
		oncropchange: (crop: CropRectangle) => void;
	} = $props();

	type CropField = keyof CropRectangle;

	const fields = [
		{ id: 'left', label: 'X', name: 'Left' },
		{ id: 'top', label: 'Y', name: 'Top' },
		{ id: 'width', label: 'W', name: 'Width' },
		{ id: 'height', label: 'H', name: 'Height' }
	] satisfies readonly { id: CropField; label: string; name: string }[];

	function maximum(field: CropField) {
		switch (field) {
			case 'left':
				return bounds.width - crop.width;
			case 'top':
				return bounds.height - crop.height;
			case 'width':
				return bounds.width - crop.left;
			case 'height':
				return bounds.height - crop.top;
			default: {
				const _exhaustive: never = field;
				return _exhaustive;
			}
		}
	}

	function minimum(field: CropField) {
		return field === 'width' || field === 'height' ? 1 : 0;
	}

	function updateField(field: CropField, event: Event) {
		if (!(event.currentTarget instanceof HTMLInputElement)) return;
		const value = event.currentTarget.valueAsNumber;
		if (!Number.isFinite(value)) return;
		const clampedValue = Math.max(minimum(field), Math.min(value, maximum(field)));
		oncropchange(createCropRectangle(bounds, { ...crop, [field]: clampedValue }));
	}
</script>

<div
	class="flex h-13 w-max min-w-full items-center gap-1.5 pr-1 sm:gap-2"
	role="tabpanel"
	aria-label="Crop settings"
>
	{#each fields as field (field.id)}
		<label
			class="flex h-9 w-20 min-w-20 shrink-0 overflow-hidden rounded-md bg-neutral-900 text-sm text-neutral-100 ring-1 ring-white/8 focus-within:ring-2 focus-within:ring-violet-300 sm:w-auto sm:min-w-25"
		>
			<span
				class="flex w-7 shrink-0 items-center justify-center bg-neutral-800 font-bold text-neutral-300 sm:w-8"
				aria-hidden="true">{field.label}</span
			>
			<span class="sr-only">{field.name}</span>
			<input
				type="number"
				class="min-w-0 flex-1 bg-transparent px-1.5 text-right font-medium tabular-nums outline-none sm:px-2"
				min={minimum(field.id)}
				max={maximum(field.id)}
				value={crop[field.id]}
				onchange={(event) => updateField(field.id, event)}
			/>
		</label>
	{/each}

	<button
		type="button"
		class="h-9 shrink-0 cursor-pointer rounded-md px-2 text-sm font-semibold text-neutral-200 outline-none hover:bg-white/8 hover:text-white focus-visible:ring-2 focus-visible:ring-violet-200 disabled:cursor-default disabled:text-neutral-600 disabled:hover:bg-transparent sm:px-3"
		disabled={isFullFrameCrop(bounds, crop)}
		onclick={() => oncropchange(createCropRectangle(bounds))}
	>
		Reset
	</button>
</div>
