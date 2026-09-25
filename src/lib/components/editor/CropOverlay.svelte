<script lang="ts">
	import type { CropRectangle } from 'mediabunny';
	import { createCropRectangle, type VideoSize } from '$lib/editing';

	type CropHandle = 'move' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
	type DragState = Readonly<{
		handle: CropHandle;
		pointerId: number;
		originX: number;
		originY: number;
		crop: CropRectangle;
	}>;

	let {
		bounds,
		crop,
		handlesActive,
		oncropchange
	}: {
		bounds: VideoSize;
		crop: CropRectangle;
		handlesActive: boolean;
		oncropchange: (crop: CropRectangle) => void;
	} = $props();

	let containerWidth = $state(0);
	let containerHeight = $state(0);
	let drag = $state<DragState | null>(null);
	let scale = $derived(
		containerWidth > 0 && containerHeight > 0
			? Math.min(containerWidth / bounds.width, containerHeight / bounds.height)
			: 0
	);
	let frameWidth = $derived(bounds.width * scale);
	let frameHeight = $derived(bounds.height * scale);
	let frameLeft = $derived((containerWidth - frameWidth) / 2);
	let frameTop = $derived((containerHeight - frameHeight) / 2);

	const handles = [
		{
			id: 'nw',
			label: 'Resize crop from top left',
			class: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize'
		},
		{
			id: 'n',
			label: 'Resize crop from top',
			class: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-n-resize'
		},
		{
			id: 'ne',
			label: 'Resize crop from top right',
			class: 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize'
		},
		{
			id: 'e',
			label: 'Resize crop from right',
			class: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-e-resize'
		},
		{
			id: 'se',
			label: 'Resize crop from bottom right',
			class: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-se-resize'
		},
		{
			id: 's',
			label: 'Resize crop from bottom',
			class: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-s-resize'
		},
		{
			id: 'sw',
			label: 'Resize crop from bottom left',
			class: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize'
		},
		{
			id: 'w',
			label: 'Resize crop from left',
			class: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-w-resize'
		}
	] satisfies readonly { id: Exclude<CropHandle, 'move'>; label: string; class: string }[];

	function cropForDrag(handle: CropHandle, start: CropRectangle, deltaX: number, deltaY: number) {
		const minSize = Math.max(1, Math.ceil(2 / Math.max(scale, 0.001)));
		const right = start.left + start.width;
		const bottom = start.top + start.height;

		if (handle === 'move') {
			return createCropRectangle(bounds, {
				...start,
				left: start.left + deltaX,
				top: start.top + deltaY
			});
		}

		let left = start.left;
		let top = start.top;
		let nextRight = right;
		let nextBottom = bottom;
		if (handle.includes('w')) left = Math.max(0, Math.min(start.left + deltaX, right - minSize));
		if (handle.includes('e'))
			nextRight = Math.min(bounds.width, Math.max(right + deltaX, left + minSize));
		if (handle.includes('n')) top = Math.max(0, Math.min(start.top + deltaY, bottom - minSize));
		if (handle.includes('s'))
			nextBottom = Math.min(bounds.height, Math.max(bottom + deltaY, top + minSize));

		return createCropRectangle(bounds, {
			left,
			top,
			width: nextRight - left,
			height: nextBottom - top
		});
	}

	function startDrag(event: PointerEvent, handle: CropHandle) {
		if (event.button !== 0 || scale === 0) return;
		event.preventDefault();
		if (event.currentTarget instanceof HTMLElement) {
			event.currentTarget.setPointerCapture(event.pointerId);
		}
		drag = {
			handle,
			pointerId: event.pointerId,
			originX: event.clientX,
			originY: event.clientY,
			crop
		};
	}

	function moveDrag(event: PointerEvent) {
		if (!drag || drag.pointerId !== event.pointerId) return;
		oncropchange(
			cropForDrag(
				drag.handle,
				drag.crop,
				Math.round((event.clientX - drag.originX) / scale),
				Math.round((event.clientY - drag.originY) / scale)
			)
		);
	}

	function stopDrag(event: PointerEvent) {
		if (drag?.pointerId === event.pointerId) drag = null;
	}

	function handleKeydown(event: KeyboardEvent, handle: CropHandle) {
		const amount = event.shiftKey ? 10 : 1;
		let deltaX = 0;
		let deltaY = 0;
		if (event.key === 'ArrowLeft') deltaX = -amount;
		else if (event.key === 'ArrowRight') deltaX = amount;
		else if (event.key === 'ArrowUp') deltaY = -amount;
		else if (event.key === 'ArrowDown') deltaY = amount;
		else return;

		event.preventDefault();
		oncropchange(cropForDrag(handle, crop, deltaX, deltaY));
	}
</script>

<div
	class="pointer-events-none absolute inset-0 z-10"
	bind:clientWidth={containerWidth}
	bind:clientHeight={containerHeight}
	aria-label="Crop overlay"
>
	{#if scale > 0}
		<div
			class="absolute"
			style:left={`${frameLeft + crop.left * scale}px`}
			style:top={`${frameTop + crop.top * scale}px`}
			style:width={`${crop.width * scale}px`}
			style:height={`${crop.height * scale}px`}
		>
			<div
				class={[
					'pointer-events-none absolute inset-0 transition-shadow motion-reduce:transition-none',
					handlesActive
						? 'border border-white/90 shadow-[0_0_0_9999px_rgb(0_0_0/0.58)]'
						: 'shadow-[0_0_0_9999px_rgb(0_0_0/0.72)]'
				]}
			></div>

			{#if handlesActive}
				<!-- Inner crop overlay lines -->
				<div class="pointer-events-none absolute inset-x-0 top-1/3 border-t border-white/25"></div>
				<div class="pointer-events-none absolute inset-x-0 top-2/3 border-t border-white/25"></div>
				<div class="pointer-events-none absolute inset-y-0 left-1/3 border-l border-white/25"></div>
				<div class="pointer-events-none absolute inset-y-0 left-2/3 border-l border-white/25"></div>

				<button
					type="button"
					class="pointer-events-auto absolute inset-2 cursor-move touch-none outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
					aria-label="Move crop"
					onpointerdown={(event) => startDrag(event, 'move')}
					onpointermove={moveDrag}
					onpointerup={stopDrag}
					onpointercancel={stopDrag}
					onkeydown={(event) => handleKeydown(event, 'move')}
				></button>

				{#each handles as handle (handle.id)}
					<button
						type="button"
						class={[
							'pointer-events-auto absolute size-5 touch-none rounded-full outline-none after:absolute after:inset-1 after:rounded-full after:border after:border-neutral-700 after:bg-white after:shadow-sm focus-visible:after:ring-2 focus-visible:after:ring-violet-300',
							handle.class
						]}
						aria-label={handle.label}
						onpointerdown={(event) => startDrag(event, handle.id)}
						onpointermove={moveDrag}
						onpointerup={stopDrag}
						onpointercancel={stopDrag}
						onkeydown={(event) => handleKeydown(event, handle.id)}
					></button>
				{/each}
			{/if}
		</div>
	{/if}
</div>
