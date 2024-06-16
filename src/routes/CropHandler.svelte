<script lang="ts">
	import { clamp } from "$lib/util";
	import { createEventDispatcher } from "svelte";

	export let cropX: number;
	export let cropY: number;
	export let cropWidth: number;
	export let cropHeight: number;

	export let videoWidth: number;
	export let videoHeight: number;
	export let playerWidth: number;
	export let playerHeight: number;
	export let show = false;
	export let video: HTMLVideoElement;

	let dragOffsetX: number | null = null;
	let dragOffsetY: number | null = null;
	$: dragging = dragOffsetX !== null || dragOffsetY !== null;
	$: cropMin = Math.ceil((videoHeight / playerHeight) * 2);
	$: smallCropBox = cropWidth < cropMin * 5 || cropHeight < cropMin * 5;

	type DragMode = 'n' | 'w' | 'e' | 's' | 'ne' | 'nw' | 'se' | 'sw' | 'f';
	let dragMode: '' | DragMode = '';

	const dispatch = createEventDispatcher();

	function startDrag(mode: DragMode) {
		return (e: MouseEvent) => {
			const { x, y } = video.getBoundingClientRect();
			dragOffsetX = e.clientX - x;
			dragOffsetY = e.clientY - y;
			dragMode = mode;
		}
	}
</script>


<svelte:body
	on:mousemove={(e) => {
		if (!dragging) return;
		const box = video.getBoundingClientRect();
		const resultX = ((e.clientX - box.x) / playerWidth) * videoWidth;
		const resultY = ((e.clientY - box.y) / playerHeight) * videoHeight;
		const movedX = Math.round(resultX) - cropX;
		const movedY = Math.round(resultY) - cropY;

		let newProps = {};

		if (dragMode.includes('n') && !(movedY < 0 && cropY <= 0) && !(movedY > 0 && cropHeight <= cropMin)) {
			newProps = {
				y: clamp(Math.round(resultY), 0, videoHeight - cropMin),
				h: clamp(Math.round(cropHeight - movedY), cropMin, videoHeight),
				...newProps
			};
		}
		if (dragMode.includes('w') && !(movedX < 0 && cropX <= 0) && !(movedX > 0 && cropWidth <= cropMin)) {
			newProps = {
				x: clamp(Math.round(resultX), 0, videoWidth - cropMin),
				w: clamp(Math.round(cropWidth - movedX), cropMin, videoWidth),
				...newProps
			};
		}
		if (dragMode.includes('s')) {
			newProps = {
				h: clamp(Math.round(resultY - cropY), cropMin, videoHeight - cropY),
				...newProps
			};
		}
		if (dragMode.includes('e')) {
			newProps = {
				w: clamp(Math.round(resultX - cropX), cropMin, videoWidth - cropX),
				...newProps
			};
		}
		if (dragMode === 'f') {
			const moveX = Math.round((e.movementX / playerWidth) * videoWidth);
			const moveY = Math.round((e.movementY / playerHeight) * videoHeight);
			newProps = {
				x: clamp(cropX + moveX, 0, videoWidth - cropWidth),
				y: clamp(cropY + moveY, 0, videoHeight - cropHeight),
				...newProps
			};
		}

		// console.log({ movedX, movedY, resultX, resultY, videoWidth, videoHeight, cropMin, e, box, video })
		if (Object.keys(newProps).length > 0) dispatch('set', newProps);
	}}
	on:mouseup={() => {
		dragOffsetX = null;
		dragOffsetY = null;
		dragMode = '';
	}}
/>

{#if cropWidth !== undefined && cropHeight !== undefined}
	<!-- Shadows -->
	<div
		class="pointer-events-none transition-opacity"
		class:opacity-50={show}
		class:opacity-75={!show}
	>
		<div
			class="absolute top-0 left-0 h-full bg-black"
			style:width={`${(cropX / videoWidth) * playerWidth}px`}
		/>
		<div
			class="absolute top-0 bg-black"
			style:left={`${(cropX / videoWidth) * playerWidth}px`}
			style:width={`calc(100% - ${(cropX / videoWidth) * playerWidth}px)`}
			style:height={`${(cropY / videoHeight) * playerHeight}px`}
		/>
		<div
			class="absolute right-0 bg-black"
			style:left={`${((cropX + cropWidth) / videoWidth) * playerWidth}px`}
			style:width={`calc(100% - ${((cropX + cropWidth) / videoWidth) * playerWidth}px)`}
			style:top={`${(cropY / videoHeight) * playerHeight}px`}
			style:height={`calc(100% - ${(cropY / videoHeight) * playerHeight}px)`}
		/>
		<div
			class="absolute bottom-0 bg-black"
			style:left={`${(cropX / videoWidth) * playerWidth}px`}
			style:width={`${(cropWidth / videoWidth) * playerWidth}px`}
			style:height={`calc(100% - ${((cropY + cropHeight) / videoHeight) * playerHeight}px)`}
		/>
	</div>

	<!-- Crop Box -->
	<div
		class="absolute transition-opacity"
		class:opacity-0={!show}
		class:pointer-events-none={!show}
		style:left={`${(cropX / videoWidth) * playerWidth}px`}
		style:top={`${(cropY / videoHeight) * playerHeight}px`}
	>
		<div
			class="relative"
			style:width={`${(cropWidth / videoWidth) * playerWidth}px`}
			style:height={`${(cropHeight / videoHeight) * playerHeight}px`}
		>
			<!-- Crop Lines -->
			<div class="w-full h-px opacity-30 absolute top-0 bg-white bg-crop-line" />
			<div class="w-full h-px opacity-30 absolute bottom-0 bg-white bg-crop-line rotate-180" />
			<div class="h-full w-px opacity-30 absolute left-0 bg-white bg-crop-line rotate-180" />
			<div class="h-full w-px opacity-30 absolute right-0 bg-white bg-crop-line" />

			<!-- Free Move Box -->
			<button class="w-full h-full absolute top-0 cursor-move" on:mousedown={startDrag('f')}  />

			<!-- Drag Bars -->
			<button class="w-full h-1.5 absolute -top-1 cursor-n-resize" on:mousedown={startDrag('n')} />
			<button class="w-full h-1.5 absolute -bottom-1 cursor-s-resize" on:mousedown={startDrag('s')} />
			<button class="h-full w-1.5 absolute -left-1 cursor-w-resize" on:mousedown={startDrag('w')} />
			<button class="h-full w-1.5 absolute -right-1 cursor-e-resize" on:mousedown={startDrag('e')} />

			<!-- Corner Handles -->
			<div class="opacity-50">
				<button
					class="w-2 h-2 bg-black ring-1 ring-white absolute -top-1 -left-1 cursor-nw-resize"
					on:mousedown={startDrag('nw')}
				/>
				<button
					class="w-2 h-2 bg-black ring-1 ring-white absolute -bottom-1 -left-1 cursor-sw-resize transition-opacity"
					class:pointer-events-none={smallCropBox}
					class:opacity-0={smallCropBox}
					on:mousedown={startDrag('sw')}
				/>
				<button
					class="w-2 h-2 bg-black ring-1 ring-white absolute -top-1 -right-1 cursor-ne-resize transition-opacity"
					class:pointer-events-none={smallCropBox}
					class:opacity-0={smallCropBox}
					on:mousedown={startDrag('ne')}
				/>
				<button
					class="w-2 h-2 bg-black ring-1 ring-white absolute -bottom-1 -right-1 cursor-se-resize"
					on:mousedown={startDrag('se')}
				/>
			</div>
		</div>
	</div>

	<!-- Cursor Box -->
	{#if dragMode}
		<div
			class="absolute -top-4 -left-full -right-full -bottom-4"
			style:cursor={dragMode === 'f' ? 'move' : `${dragMode}-resize`}
		/>
	{/if}
{/if}
