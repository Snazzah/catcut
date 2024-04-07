<script lang="ts">
	import { RemoteFile } from '$lib/util';
	import { filesize } from 'filesize';
	import ms from 'pretty-ms';
	import { createEventDispatcher } from 'svelte';

	const msOptions = { colonNotation: true, secondsDecimalDigits: 2, keepDecimalsOnWholeSeconds: true };

	export let dispatch = createEventDispatcher();
	export let file: File | RemoteFile;
	export let blobURL: string;

	let currentTime = 0;
	let duration = 0;
	let paused = true;

	let video: HTMLVideoElement;
	let timelineElement: HTMLDivElement;

	let hoveredTime = -1;
</script>


<section class="w-full flex flex-col justify-center px-2 gap-4 py-4">
	<div class="flex flex-col items-center justify-center">
		<span class="text-violet-300 no-ligatures w-full text-center truncate">{file.name}</span>
		<div class="flex gap-4 text-sm">
			<span>{filesize(file.size, { standard: 'jedec' })}</span>
			<button class="transition-colors hover:text-red-400" on:click={() => dispatch('close')}>close</button>
		</div>
	</div>

	<!-- svelte-ignore a11y-media-has-caption -->
	<video
		src={blobURL}
		crossorigin="anonymous"
		playsinline
		disablepictureinpicture
		class="aspect-video md:max-h-96 max-h-64 bg-neutral-900/25"
		bind:currentTime={currentTime}
		bind:duration={duration}
		bind:paused={paused}
		bind:this={video}
	/>

	<div class="flex flex-col w-full">
		<!-- svelte-ignore a11y-interactive-supports-focus a11y-click-events-have-key-events -->
		<div
			class="relative w-full h-12 bg-neutral-900 mt-6"
			role="button"
			on:mousemove={(e) => hoveredTime = (e.offsetX / timelineElement.clientWidth) * duration}
			on:mouseleave={() => hoveredTime = -1}
			on:click={() => {
				currentTime = hoveredTime;
				video.currentTime = hoveredTime;
			}}
			bind:this={timelineElement}
		>

			<!-- Hovered Time -->
			{#if hoveredTime >= 0}
				<div class="w-px h-full bg-white/25 text-center absolute pointer-events-none select-none" style:left={`${(hoveredTime / duration) * 100}%`}>
					<div class="flex justify-center relative">
						<code class="absolute bottom-full text-white/25 px-1 rounded text-xs">
							{ms(hoveredTime * 1000, msOptions)}
						</code>
					</div>
				</div>
			{/if}

			<!-- Current Time -->
			<div class="w-px h-full bg-white text-center absolute pointer-events-none select-none" style:left={`${(currentTime / duration) * 100}%`}>
				<div class="flex justify-center relative">
					<code class="absolute bottom-full text-black bg-white px-1 rounded text-xs">
						{ms(currentTime * 1000, msOptions)}
					</code>
				</div>
			</div>


		</div>

		<div class="flex justify-between">
			<code>{ms(0, msOptions)}</code>
			<code>{ms(duration * 1000, msOptions)}</code>
		</div>
	</div>

	<button on:click={() => {
		if (paused) {
			// "wake up" the currentTime listener
			currentTime = 0;
			currentTime = video.currentTime;

			video.play();
		} else video.pause();
	}}>{paused ? 'play' : 'pause'}</button>

</section>
