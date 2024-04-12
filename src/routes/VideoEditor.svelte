<script lang="ts">
	import { ProcessingState, RemoteFile, validEvent } from '$lib/util';
	import { filesize } from 'filesize';
	import ms from 'pretty-ms';
	import { createEventDispatcher } from 'svelte';
	import playIcon from "@iconify-icons/mdi/play-arrow";
	import pauseIcon from "@iconify-icons/mdi/pause";
	import back10Icon from "@iconify-icons/mdi/rewind-10";
	import forward10Icon from "@iconify-icons/mdi/fast-forward-10";
	import processingIcon from '@iconify-icons/fluent-emoji/crystal-ball';
	import worryIcon from "@iconify-icons/fluent-emoji/worried-face";
	import yayIcon from "@iconify-icons/fluent-emoji/party-popper";
	import Icon from '@iconify/svelte';
	import { skipNext, skipPrevious } from '$lib/icons';
	import trimIcon from "@iconify-icons/mdi/content-cut";
	import PlayerButton from '$lib/components/PlayerButton.svelte';
	import type { IconifyIcon } from '@iconify/svelte';
	import PreviewStillContainer from './PreviewStillContainer.svelte';
	import { MS_OPTIONS } from '$lib/util';
	import { ffmpeg } from '$lib/ffmpeg';
	import Trim from '$lib/components/video/Trim.svelte';
	import EditorTabs from '$lib/components/EditorTabs.svelte';
	import Modal from './Modal.svelte';
	import { fetchFile } from '@ffmpeg/util';
	import { scale } from 'svelte/transition';

	export let dispatch = createEventDispatcher();
	export let file: File | RemoteFile;
	export let blobURL: string;

	const isRemote = file instanceof RemoteFile;
	const extension = file.name.split('.').reverse()[0];

	let modalOpen = false;
	let processState = ProcessingState.IDLE;

	async function saveVideo() {
		processState = ProcessingState.WRITING;
		modalOpen = true;

		try {
			console.time('ffmpeg');
			await ffmpeg.writeFile(`in.${extension}`, await fetchFile(file instanceof RemoteFile ? file.blob : file));
			processState = ProcessingState.RUNNING;
			console.log(' ---- RUNNING FFmpeg ---- ');
			await ffmpeg.exec([
				'-i', `in.${extension}`,
				'-ss', ms(trimStart * 1000, MS_OPTIONS),
				'-t', ms((trimEnd - trimStart) * 1000, MS_OPTIONS),
				'-c:v', 'copy',
				'-c:a', 'copy',
				`out.${extension}`
			]);
			processState = ProcessingState.READING;
			const data = await ffmpeg.readFile(`out.${extension}`);
			const blob = new Blob([(data as Uint8Array).buffer], { type: file.type });
			const downloadURL = URL.createObjectURL(blob);
			console.log(' ---- FINISHED ---- ');

			processState = ProcessingState.DONE;

			console.timeEnd('ffmpeg');

			const a = document.createElement('a');
			a.href = downloadURL;
			a.download = `output_${file.name}`;
			a.click();

			setTimeout(() => {
				URL.revokeObjectURL(downloadURL);
				a.remove();
			}, 100);
		} catch (e) {
			console.error('Failed to save video', e);
			processState = ProcessingState.ERROR;
		} finally {
			console.log(' ---- CLEANUP ---- ');
			await ffmpeg.deleteFile(`in.${extension}`);
			await ffmpeg.deleteFile(`out.${extension}`);
		}
	}

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
	let showTrimHandles = false;
	$: isDraggingTrimHandle = trimStartHandleDragOffset >= 0 || trimEndHandleDragOffset >= 0;

	let video: HTMLVideoElement;
	let videoWidth: number;
	let videoHeight: number;
	let timelineElement: HTMLButtonElement;
	let timelineWidth = 0;

	let hoveredTime = -1;

	const editorComponents: Record<string, {
		name: string;
		icon: IconifyIcon;
		onShow?(): void;
		onHide?(): void;
		onOpen?(): void;
		onClose?(): void;
	}> = {
		trim: {
			name: 'Trim',
			icon: trimIcon,
			onShow() { showTrimHandles = true; },
			onHide() { showTrimHandles = false; },
			onClose() {
				trimStart = 0;
				trimEnd = duration;
				showTrimHandles = false;
			}
		}
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

				if (!showTrimHandles) return;
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
						class="absolute top-full text-violet-300 px-1 rounded transition-all pointer-events-none"
						class:opacity-0={!willBeTrimmed}
						class:-ml-16={handleDistance < 100}
					>
						{ms(trimStart * 1000, MS_OPTIONS)}
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
						class="absolute top-full text-violet-300 px-1 rounded transition-all pointer-events-none"
						class:opacity-0={!willBeTrimmed}
						class:ml-16={handleDistance < 100}
					>
						{ms(trimEnd * 1000, MS_OPTIONS)}
					</code>
				</div>
			</div>

			<!-- Trim Duration -->
			<div class="w-px h-full text-center absolute top-0 pointer-events-none" style:left={`${((trimStart + (trimEnd - trimStart) / 2) / duration) * 100}%`}>
				<div class="flex justify-center h-full relative">
					<code class="absolute top-full text-white/50 px-1 rounded text-xs transition-opacity" class:opacity-0={!willBeTrimmed || handleDistance < 140}>
						{ms((trimEnd - trimStart) * 1000, MS_OPTIONS)}
					</code>
				</div>
			</div>

			<!-- Hovered Time -->
			{#if hoveredTime >= 0}
				<div class="w-px h-full bg-white/25 text-center absolute top-0 pointer-events-none" style:left={`${(hoveredTime / duration) * 100}%`}>
					<div class="flex justify-center relative">
						<code class="absolute bottom-full text-white/25 px-1 rounded text-xs">
							{ms(hoveredTime * 1000, MS_OPTIONS)}
						</code>
					</div>
				</div>
			{/if}

			<!-- Current Time -->
			<div class="w-px h-full bg-white text-center absolute top-0 pointer-events-none" style:left={`${(currentTime / duration) * 100}%`}>
				<div class="flex justify-center relative">
					<code class="absolute bottom-full text-black bg-white px-1 rounded text-xs font-bold">
						{ms(currentTime * 1000, MS_OPTIONS)}
					</code>
				</div>
			</div>
		</button>

		<label class="flex justify-between pointer-events-none select-none" for="timeline">
			<code class="transition-opacity" class:opacity-0={willBeTrimmed}>{ms(trimStart * 1000, MS_OPTIONS)}</code>
			<code class="transition-opacity" class:opacity-0={willBeTrimmed}>{ms(trimEnd * 1000, MS_OPTIONS)}</code>
		</label>
	</div>

	<EditorTabs
		tabs={Object.keys(editorComponents).map((id) => ({ id, name: editorComponents[id].name, icon: editorComponents[id].icon }))}
		on:showtab={(e) => editorComponents[e.detail]?.onShow?.()}
		on:hidetab={(e) => editorComponents[e.detail]?.onHide?.()}
		on:opentab={(e) => editorComponents[e.detail]?.onOpen?.()}
		on:closetab={(e) => editorComponents[e.detail]?.onClose?.()}
		on:save={saveVideo}
		let:tab
	>
		{#if tab === 'trim'}
			<Trim {trimStart} {trimEnd} />
		{/if}
	</EditorTabs>

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

<!-- Processing Modal -->
<Modal
	open={modalOpen}
	on:clickout={() => {
		if ([ProcessingState.WRITING, ProcessingState.RUNNING, ProcessingState.READING].includes(processState)) return;
		modalOpen = false;
	}}
	class={`w-96 border-2 px-2 py-4 rounded-xl shadow-md flex-col justify-center items-center inline-flex transition-all ${
		processState === ProcessingState.ERROR ? 'bg-red-950 border-red-800' :
		processState === ProcessingState.DONE ? 'bg-green-950 border-green-800' :
		'bg-blue-950 border-blue-800'
	}`}
>
	<div class="relative w-32 h-32 mb-4 -mt-24">
		{#if processState === ProcessingState.ERROR}
			<div transition:scale class="absolute w-full h-full">
				<Icon icon={worryIcon} class="w-full h-full" />
			</div>
		{:else if processState === ProcessingState.DONE}
			<div transition:scale class="absolute w-full h-full">
				<Icon icon={yayIcon} class="w-full h-full" />
			</div>
		{:else}
			<div transition:scale class="absolute w-full h-full">
				<Icon icon={processingIcon} class="w-full h-full" />
			</div>
		{/if}
	</div>
	<h2 class="font-bold tracking-wide text-2xl">
		{#if processState === ProcessingState.ERROR}
		  Oh no...
		{:else if processState === ProcessingState.DONE}
			Done!
		{:else}
			Processing...
		{/if}
	</h2>
	{#if processState === ProcessingState.ERROR}
		<span>An error occurred while processing! Check console for details.</span>
	{:else if processState === ProcessingState.IDLE}
		<span>Waiting...</span>
	{:else if processState === ProcessingState.WRITING}
		<span>Loading file...</span>
	{:else if processState === ProcessingState.RUNNING}
		<span>Running FFmpeg command...</span>
	{:else if processState === ProcessingState.READING}
		<span>Reading result...</span>
	{:else if processState === ProcessingState.DONE}
		<span>Your video has finished processing!</span>
	{/if}
</Modal>
