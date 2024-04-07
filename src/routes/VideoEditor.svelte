<script lang="ts">
	import { RemoteFile } from '$lib/util';
	import { filesize } from 'filesize';
	import ms from 'pretty-ms';
	import { createEventDispatcher } from 'svelte';

	const msOptions = { colonNotation: true, secondsDecimalDigits: 2, keepDecimalsOnWholeSeconds: true };

	export let dispatch = createEventDispatcher();
	export let file: File | RemoteFile;
	export let blobURL: string;

	const isRemote = file instanceof RemoteFile;

	let currentTime = 0;
	let duration = 0;
	let paused = true;

	let video: HTMLVideoElement;
	let videoWidth: number;
	let videoHeight: number;
	let timelineElement: HTMLButtonElement;

	let hoveredTime = -1;

	function onKeyPress(e: KeyboardEvent) {
		if (document.activeElement && ['A', 'BUTTON', 'INPUT'].includes(document.activeElement.tagName) && document.activeElement !== timelineElement) return;

		if (e.key === 'ArrowLeft') video.currentTime -= 1;
		else if (e.key === 'ArrowRight') video.currentTime += 1;
		else if (e.key === ' ') onPlaybackToggle();
		currentTime = video.currentTime;
	}

	function onPlaybackToggle() {
		if (paused) {
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

<svelte:body on:keydown={onKeyPress} />

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

	<div class="flex flex-col w-full">
		<!-- Timeline -->
		<button
			class="relative w-full h-12 bg-neutral-900 mt-6 outline-none transition-all ring-offset-1 ring-offset-neutral-950 ring-violet-400/50 focus:ring-2"
			id="timeline"
			on:mousemove={(e) => hoveredTime = (e.offsetX / timelineElement.clientWidth) * duration}
			on:mouseleave={() => hoveredTime = -1}
			on:click={(e) => {
				if (!validEvent(e)) return;
				currentTime = hoveredTime;
				video.currentTime = hoveredTime;
			}}
			bind:this={timelineElement}
		>

			<!-- Hovered Time -->
			{#if hoveredTime >= 0}
				<div class="w-px h-full bg-white/25 text-center absolute top-0 pointer-events-none select-none" style:left={`${(hoveredTime / duration) * 100}%`}>
					<div class="flex justify-center relative">
						<code class="absolute bottom-full text-white/25 px-1 rounded text-xs">
							{ms(hoveredTime * 1000, msOptions)}
						</code>
					</div>
				</div>
			{/if}

			<!-- Current Time -->
			<div class="w-px h-full bg-white text-center absolute top-0 pointer-events-none select-none" style:left={`${(currentTime / duration) * 100}%`}>
				<div class="flex justify-center relative">
					<code class="absolute bottom-full text-black bg-white px-1 rounded text-xs">
						{ms(currentTime * 1000, msOptions)}
					</code>
				</div>
			</div>
		</button>

		<label class="flex justify-between select-none" for="timeline">
			<code>{ms(0, msOptions)}</code>
			<code>{ms(duration * 1000, msOptions)}</code>
		</label>
	</div>

	<button on:click={onPlaybackToggle}>
		{paused ? 'play' : 'pause'}
	</button>

</section>
