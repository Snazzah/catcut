<script lang="ts">
	import { RemoteFile } from '$lib/util';
	import { filesize } from 'filesize';
	import ms from 'pretty-ms';
	import { createEventDispatcher } from 'svelte';
	import playIcon from "@iconify-icons/mdi/play-arrow";
	import pauseIcon from "@iconify-icons/mdi/pause";
	import back10Icon from "@iconify-icons/mdi/rewind-10";
	import forward10Icon from "@iconify-icons/mdi/fast-forward-10";
	import { skipNext, skipPrevious, windowClose as closeIcon } from '$lib/icons';
	import trimIcon from "@iconify-icons/mdi/content-cut";
	import addIcon from "@iconify-icons/mdi/plus";
	import PlayerButton from '$lib/components/PlayerButton.svelte';
	import Icon, { type IconifyIcon } from '@iconify/svelte';
	import PreviewStillContainer from './PreviewStillContainer.svelte';

	const msOptions = { colonNotation: true, secondsDecimalDigits: 2, keepDecimalsOnWholeSeconds: true };

	export let dispatch = createEventDispatcher();
	export let file: File | RemoteFile;
	export let blobURL: string;

	const isRemote = file instanceof RemoteFile;

	let currentTime = 0;
	let duration = 0;
	let paused = true;

	let trimStart = 0;
	let trimEnd = 0;
	$: if (duration) trimEnd = duration;

	// Seek at the trimmed start
	$: if (currentTime < trimStart) seek(trimStart);

	// Stop at the trimmed end
	$: if (currentTime > trimEnd) {
		seek(trimEnd);
		video.pause();
	}

	$: handleDistance = ((trimEnd - trimStart) / duration) * timelineWidth;
	$: willBeTrimmed = trimStart !== 0 || trimEnd !== duration;

	let trimStartHandleDragOffset = -1;
	let trimEndHandleDragOffset = -1;
	let trimStartHandle: HTMLButtonElement;
	let trimEndHandle: HTMLButtonElement;
	let trimEventBounce = false;
	$: isDraggingTrimHandle = trimStartHandleDragOffset >= 0 || trimEndHandleDragOffset >= 0;

	let video: HTMLVideoElement;
	let videoWidth: number;
	let videoHeight: number;
	let timelineElement: HTMLButtonElement;
	let timelineWidth = 0;

	let hoveredTime = -1;

	$: showTrimHandles = currentTab === 'trim';
	let currentTab = 'trim';
	let shownTabs = ['trim', 'new'];
	const allTabs: Record<string, [string, IconifyIcon]> = {
		new: ['New', addIcon],
		trim: ['Trim', trimIcon],
	}

	function onKeyPress(e: KeyboardEvent) {
		if (document.activeElement && ['A', 'BUTTON', 'INPUT'].includes(document.activeElement.tagName) && document.activeElement !== timelineElement && !timelineElement.contains(document.activeElement)) return;

		if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
			if (document.activeElement === trimStartHandle) {
				seek(trimStart);
				if (e.key === 'ArrowLeft') seekBy(-1);
				else if (e.key === 'ArrowRight') seekBy(1);
				trimStart = currentTime;
				return;
			} else if (document.activeElement === trimEndHandle) {
				seek(trimEnd);
				if (e.key === 'ArrowLeft') seekBy(-1);
				else if (e.key === 'ArrowRight') seekBy(1);
				trimEnd = currentTime;
				return;
			}
		}

		if (e.key === 'ArrowLeft') seekBy(-1);
		else if (e.key === 'ArrowRight') seekBy(1);
		else if (e.key === ' ') onPlaybackToggle();
	}

	function seekBy(by: number) {
		video.currentTime += by;
		currentTime = video.currentTime;
	}

	function seek(by: number) {
		video.currentTime = by;
		currentTime = video.currentTime;
	}

	function onPlaybackToggle() {
		if (paused) {
			if (video.currentTime >= (trimEnd - 0.001)) video.currentTime = trimStart;

			// "wake up" the currentTime listener
			currentTime = 0;
			currentTime = video.currentTime;

			video.play();
		} else video.pause();
	}

	function validEvent(e: MouseEvent) {
		return (e as any).pointerType !== '';
	}
</script>

<svelte:body
	on:keydown={onKeyPress}
	on:mousemove={(e) => {
		if (!isDraggingTrimHandle) return;
		const timelineBox = timelineElement.getBoundingClientRect();
		if (trimStartHandleDragOffset >= 0) {
			const newTime = ((e.clientX - (timelineBox.left + trimStartHandleDragOffset)) / timelineBox.width) * duration;
			trimStart = Math.max(0, Math.min(duration, newTime));
			seek(trimStart);
		} else if (trimEndHandleDragOffset >= 0) {
			const newTime = ((e.clientX - (timelineBox.left + trimEndHandleDragOffset)) / timelineBox.width) * duration;
			trimEnd = Math.max(0, Math.min(duration, newTime));
			seek(trimEnd);
		}
	}}
	on:mouseup={(e) => {
		if (e.target === timelineElement && isDraggingTrimHandle) trimEventBounce = true;
		trimStartHandleDragOffset = -1;
		trimEndHandleDragOffset = -1;
	}}
/>

<section class="w-full flex flex-col justify-center px-10 gap-4 py-4">
	<div class="flex flex-col items-center justify-center">
		<span class="text-violet-300 no-ligatures w-full text-center truncate">{file.name}</span>
		<div class="flex gap-4 text-xs">
			<span>{filesize(file.size, { standard: 'jedec' })}</span>
			{#if video}
				<span>{videoWidth}x{videoHeight}</span>
				<span>{ms(duration * 1000)}</span>
			{/if}
		</div>
		<div class="flex gap-4 text-sm mt-2">
			<button class="transition-colors hover:text-red-400" on:click={() => dispatch('close')}>close</button>
			{#if isRemote}
				<a href={blobURL} download={file.name} class="transition-colors hover:text-violet-400">download</a>
			{/if}
		</div>
	</div>

	<!-- svelte-ignore a11y-media-has-caption -->
	<video
		src={blobURL}
		crossorigin="anonymous"
		playsinline
		disablepictureinpicture
		class="max-h-[40svh] bg-neutral-900/25"
		bind:currentTime={currentTime}
		bind:duration={duration}
		bind:paused={paused}
		bind:videoHeight={videoHeight}
		bind:videoWidth={videoWidth}
		bind:this={video}
	/>

	<div class="flex justify-center gap-2">
		<PlayerButton icon={skipPrevious} title="Seek to beginning" on:click={() => seek(0)} />
		<PlayerButton icon={back10Icon} title="Rewind 10 seconds" on:click={() => seekBy(-10)} />
		<PlayerButton icon={paused ? playIcon : pauseIcon} title={paused ? 'Play' : 'Pause'} on:click={onPlaybackToggle} />
		<PlayerButton icon={forward10Icon} title="Fast forward 10 seconds" on:click={() => seekBy(10)} />
		<PlayerButton icon={skipNext} title="Seek to end" on:click={() => seek(duration)} />
	</div>

	<div class="flex flex-col w-full select-none">
		<!-- Timeline -->
		<button
			class="relative w-full h-12 bg-neutral-900 mt-6 outline-none transition-all ring-offset-1 ring-offset-neutral-950 ring-violet-400/50 focus:ring-2 cursor-default"
			class:cursor-ew-resize={isDraggingTrimHandle}
			id="timeline"
			on:mousemove={(e) => {
				if (isDraggingTrimHandle) hoveredTime = -1;
				else if (e.target === timelineElement) hoveredTime = (e.offsetX / timelineWidth) * duration;
				else {
					const timelineBox = timelineElement.getBoundingClientRect();
					hoveredTime = Math.max(0, Math.min(duration, ((e.clientX - timelineBox.left) / timelineBox.width) * duration))
				}
			}}
			on:mouseleave={() => hoveredTime = -1}
			on:click={(e) => {
				if (!validEvent(e)) return;
				if (trimEventBounce) return void (trimEventBounce = false);
				currentTime = hoveredTime;
				video.currentTime = hoveredTime;

				if (hoveredTime > trimEnd) trimEnd = hoveredTime;
				else if (hoveredTime < trimStart) trimStart = hoveredTime;
			}}
			bind:this={timelineElement}
			bind:clientWidth={timelineWidth}
		>
			<!-- Preview Stills -->
			<PreviewStillContainer {videoWidth} {videoHeight} {duration} src={blobURL} />

			<!-- Trim Shadows -->
			<div class="bg-black/75 h-full absolute top-0 left-0 pointer-events-none"  style:width={`${(trimStart / duration) * 100}%`} />
			<div class="bg-black/75 h-full absolute top-0 right-0 pointer-events-none"  style:width={`${((duration - trimEnd) / duration) * 100}%`} />

			<!-- Trim Handles -->
			<div
				class="w-px h-full text-center absolute top-0"
				class:pointer-events-none={trimStartHandleDragOffset >= 0}
				style:left={`${(trimStart / duration) * 100}%`}
			>
				<div class="flex justify-center h-full relative">
					<button
						class="absolute right-full h-full w-1.5 bg-violet-500 rounded-l outline-none ring-0 transition-all ring-violet-500/25 focus:ring-4 disabled:opacity-0"
						disabled={!showTrimHandles}
						on:mousedown={(e) => {
							trimStartHandleDragOffset = e.offsetX;
							hoveredTime = -1;
							seek(trimStart);
						}}
						bind:this={trimStartHandle}
					/>
					<code
						class="absolute top-full text-violet-300 px-1 rounded transition-all"
						class:opacity-0={trimStart === 0}
						class:-ml-16={handleDistance < 100}
					>
						{ms(trimStart * 1000, msOptions)}
					</code>
				</div>
			</div>
			<div
				class="w-px h-full text-center absolute top-0"
				class:pointer-events-none={trimEndHandleDragOffset >= 0}
				style:left={`${(trimEnd / duration) * 100}%`}
			>
				<div class="flex justify-center h-full relative">
					<button
						class="absolute left-full h-full w-1.5 bg-violet-500 rounded-r outline-none ring-0 transition-all ring-violet-500/25 focus:ring-4 disabled:opacity-0"
						disabled={!showTrimHandles}
						on:mousedown={(e) => {
							trimEndHandleDragOffset = e.offsetX;
							hoveredTime = -1;
							seek(trimEnd);
						}}
						bind:this={trimEndHandle}
					/>
					<code
						class="absolute top-full text-violet-300 px-1 rounded transition-all"
						class:opacity-0={trimEnd === duration}
						class:ml-16={handleDistance < 100}
					>
						{ms(trimEnd * 1000, msOptions)}
					</code>
				</div>
			</div>

			<!-- Trim Duration -->
			<div class="w-px h-full text-center absolute top-0 pointer-events-none" style:left={`${((trimStart + (trimEnd - trimStart) / 2) / duration) * 100}%`}>
				<div class="flex justify-center h-full relative">
					<code class="absolute top-full text-white/25 px-1 rounded text-xs transition-opacity" class:opacity-0={!willBeTrimmed || handleDistance < 140}>
						{ms((trimEnd - trimStart) * 1000, msOptions)}
					</code>
				</div>
			</div>

			<!-- Hovered Time -->
			{#if hoveredTime >= 0}
				<div class="w-px h-full bg-white/25 text-center absolute top-0 pointer-events-none" style:left={`${(hoveredTime / duration) * 100}%`}>
					<div class="flex justify-center relative">
						<code class="absolute bottom-full text-white/25 px-1 rounded text-xs">
							{ms(hoveredTime * 1000, msOptions)}
						</code>
					</div>
				</div>
			{/if}

			<!-- Current Time -->
			<div class="w-px h-full bg-white text-center absolute top-0 pointer-events-none" style:left={`${(currentTime / duration) * 100}%`}>
				<div class="flex justify-center relative">
					<code class="absolute bottom-full text-black bg-white px-1 rounded text-xs font-bold">
						{ms(currentTime * 1000, msOptions)}
					</code>
				</div>
			</div>
		</button>

		<label class="flex justify-between pointer-events-none select-none" for="timeline">
			<code class="transition-opacity" class:opacity-0={trimStart !== 0}>{ms(trimStart * 1000, msOptions)}</code>
			<code class="transition-opacity" class:opacity-0={trimEnd !== duration}>{ms(trimEnd * 1000, msOptions)}</code>
		</label>
	</div>

	<div class="flex flex-col">
		<div class="flex justify-between">
			<div class="flex gap-0.5 overflow-hidden">
				{#each shownTabs as tab}
					<button
						class="flex gap-2 justify-center items-center rounded-t-md px-4 py-2 transition-all"
						class:bg-neutral-800={currentTab === tab}
						class:text-white={currentTab === tab}
						class:bg-neutral-900={currentTab !== tab}
						class:translate-y-1={currentTab !== tab}
						on:click={() => currentTab = tab}
					>
						<Icon icon={allTabs[tab][1]} />
						<span>{allTabs[tab][0]}</span>
						{#if tab !== 'new'}
							<button class="rounded-full transition-colors bg-neutral-400 text-neutral-800 hover:bg-red-600 hover:text-white" on:click|stopPropagation>
								<Icon icon={closeIcon} />
							</button>
						{/if}
					</button>
				{/each}
			</div>
			<button class="rounded-lg bg-violet-600 text-white px-4 my-0.5 font-bold">
				<span>Save</span>
			</button>
		</div>
		<div class="rounded-b-md rounded-tr-md bg-neutral-800 p-4 flex h-24">
			{#if currentTab === 'trim'}
				Trimming!
			{:else if currentTab === 'new'}
				<button class="rounded-lg bg-violet-600 text-white px-6 text-sm flex flex-col gap-2 justify-center items-center">
					<Icon icon={trimIcon} class="w-6 h-6" />
					<span>Trim</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- [
  "-i",
  "input.mp4",
  "-ss", "00:03:32.40",
  "-t", "00:03:50.19",
  "-c:v", "copy",
  "-c:a", "copy",
  "output.mp4"
] -->

</section>
