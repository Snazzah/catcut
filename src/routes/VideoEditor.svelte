<script lang="ts">
	import { ProcessingState, RemoteFile, splitFilename, validEvent } from '$lib/util';
	import { filesize } from 'filesize';
	import ms from 'pretty-ms';
	import { createEventDispatcher } from 'svelte';
	import playIcon from '@iconify-icons/mdi/play-arrow';
	import speedIcon from '@iconify-icons/mdi/speedometer-slow';
	import pauseIcon from '@iconify-icons/mdi/pause';
	import back10Icon from '@iconify-icons/mdi/rewind-10';
	import forward10Icon from '@iconify-icons/mdi/fast-forward-10';
	import skipNextIcon from '@iconify-icons/mdi/skip-next';
	import skipPreviousIcon from '@iconify-icons/mdi/skip-previous';
	import convertIcon from '@iconify-icons/mdi/file-arrow-left-right';
	import trimIcon from '@iconify-icons/mdi/content-cut';
	import volumeIcon from '@iconify-icons/mdi/volume-high';
	import resizeIcon from '@iconify-icons/mdi/aspect-ratio';
	import compressIcon from '@iconify-icons/mdi/zip-box';
	import bitrateIcon from '@iconify-icons/mdi/music-note';
	import cropIcon from '@iconify-icons/mdi/crop';
	import PlayerButton from '$lib/components/PlayerButton.svelte';
	import type { IconifyIcon } from '@iconify/svelte';
	import PreviewStillContainer from './PreviewStillContainer.svelte';
	import { MS_OPTIONS } from '$lib/util';
	import { ffmpeg } from '$lib/ffmpeg';
	import Trim from '$lib/components/video/Trim.svelte';
	import Volume from '$lib/components/common/Volume.svelte';
	import EditorTabs from '$lib/components/EditorTabs.svelte';
	import { fetchFile } from '@ffmpeg/util';
	import ProcessingModal from './ProcessingModal.svelte';
	import Convert from '$lib/components/video/Convert.svelte';
	import Compress from '$lib/components/video/Compress.svelte';
	import Bitrate from '$lib/components/common/Bitrate.svelte';
	import Crop from '$lib/components/video/Crop.svelte';
	import CropHandler from './CropHandler.svelte';
	import ScreenshotButtons from './ScreenshotButtons.svelte';
	import Resize from '$lib/components/video/Resize.svelte';
	import Speed from '$lib/components/common/Speed.svelte';
	import { generatePitchSpeedAudioCommand } from '$lib/utils/speed-utils';

	export let dispatch = createEventDispatcher();
	export let file: File | RemoteFile;
	export let blobURL: string;

	const isRemote = file instanceof RemoteFile;
	const [basename, extension] = splitFilename(file.name);

	let modalOpen = false;
	let processState = ProcessingState.IDLE;
	let resultInfo: { elapsed: number; size: number } | null = null;

	async function runFFmpeg(args: string[]) {
		console.log(`Running command: ffmpeg ${args.join(' ')}`);
		await ffmpeg.exec(args);
	}

	async function saveVideo() {
		processState = ProcessingState.WRITING;
		modalOpen = true;
		resultInfo = null;
		const outExt = toExtension ?? extension;
		const compressionArgs = [
			['-preset', 'ultrafast'], // = 0
			['-preset', 'veryslow', '-crf', '28'], // = 1
			['-preset', 'veryslow', '-crf', '32'], // = 2
			['-preset', 'veryslow', '-crf', '40'], // = 3
			['-preset', 'veryslow', '-crf', '51'], // = 4
		];

		try {
			window.plausible?.('File saved', { props: { extension } })
		} catch (e) { /** */ }

		try {
			console.time('ffmpeg');
			await ffmpeg.writeFile(
				`in.${extension}`,
				await fetchFile(file instanceof RemoteFile ? file.blob : file)
			);
			processState = ProcessingState.RUNNING;
			const start = Date.now();
			console.log(' ---- RUNNING FFmpeg ---- ');
			const resizingVideo: boolean = ((!!resizeHeight) || (!!resizeWidth));
			const converting = !!toExtension;
			const bitrateChanged = bitrate > 0;

			const speedFactorInternal: number = speedFactor ?? 1;

			let rw2 = resizeWidth;
			let rh2 = resizeHeight;

			if (resizingVideo) {
				const aspectRatio = willCrop ? Math.max(cropWidth,1)/Math.max(cropHeight,1) : Math.max(videoWidth,1)/Math.max(videoHeight,1);
				if (!rw2) {
					rw2 = rh2 * aspectRatio;
				}
				if (!rh2) {
					rh2 = rw2 * (1 / aspectRatio);
				}
			}

			const complexSpeedVideoCommand = speedFactorInternal !== 1 ? `setpts=PTS/${speedFactorInternal}` : '';
			const complexCropVideoCommand = willCrop ? `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}` : '';
			const complexResizeVideoCommand = resizingVideo ? `scale=ceil(${rw2}/2)*2:ceil(${rh2}/2)*2,setsar=1` : '';

			const volumeFilter = (volume !== 1 || volumeMode !== 0) && volumeMode === 0 ? `volume=${volume.toFixed(2)}` : '';
			const loudNormFilter = (volume !== 1 || volumeMode !== 0) && volumeMode === 1 ? `loudnorm=I=${loudnormArgs[0].toFixed(2)}:LRA=${loudnormArgs[1].toFixed(2)}:TP=${loudnormArgs[2].toFixed(2)}` : '';

			const complexPitchSpeedAudioCommand = generatePitchSpeedAudioCommand(speedFactorInternal, keepPitch, semitoneFactor);

			const complexVideoFilterPart = [complexCropVideoCommand, complexResizeVideoCommand, complexSpeedVideoCommand].filter(v => !!v);
			const complexAudioFilterPart = [volumeFilter, loudNormFilter, complexPitchSpeedAudioCommand].filter(v=>!!v);
			const allComplexFilters: string[] = [];
			if(complexVideoFilterPart.length >= 1) {
					allComplexFilters.push(`[0:v]${complexVideoFilterPart.join(',')}[v]`);
			}

			if(complexAudioFilterPart.length >= 1) {
				allComplexFilters.push(`[0:a]${complexAudioFilterPart.join(',')}[a]`);
			}


			const otherFiltersUsed = volume !== 1 || volumeMode !== 0 || bitrateChanged || converting || willCrop || compressionLevel !== 0 || resizingVideo || allComplexFilters.length >= 1;
			let trimOnNextCall = false;
			const trimArgs = [
				'-ss', ms(trimStart * 1000, MS_OPTIONS),
				'-t', ms((trimEnd - trimStart) * 1000, MS_OPTIONS)
			];

			// If a WebM is being trimmed and converted, pass along the trim to the next call
			if (extension === 'webm' && converting) trimOnNextCall = true;

			// For resource intensive calls, we trim first, then run other filters
			if (willBeTrimmed && !trimOnNextCall) {
				await runFFmpeg([
					'-i',
					`in.${extension}`,
					...trimArgs,
					...(trimReencoding ? ['-preset', 'ultrafast'] : ['-c:v', 'copy', '-c:a', 'copy']),
					`clip.${extension}`
				]);
				await ffmpeg.deleteFile(`in.${extension}`);
				await ffmpeg.rename(`clip.${extension}`, `in.${extension}`);
			}


			if (!otherFiltersUsed) {
				// no other filters used
				await ffmpeg.rename(`in.${extension}`, `out.${extension}`)
			}
			else {
				const complexFilter: string = allComplexFilters.length >= 1 ? allComplexFilters.join(';') : '';


				const ffCommand = [
				'-i',
				`in.${extension}`,
				...(willBeTrimmed && trimOnNextCall ? trimArgs : []),
				...(volume === 0
					? ['-an']
					: ((complexAudioFilterPart.length >= 1)
						? []
						: (!converting && !bitrateChanged && allComplexFilters.length === 0
							? ['-c:a', 'copy']
							: []))),
				...(bitrateChanged && volume !== 0 ? ['-b:a', `${bitrate}k`] : []),
				...(complexFilter ? ['-filter_complex', complexFilter, ...(complexVideoFilterPart.length >= 1 ? ['-map', '[v]'] : ['-map', '0:v']), ...(complexAudioFilterPart.length >= 1 ? ['-map', '[a]'] : ['-map', '0:a'])] : []),
				...(
					(complexVideoFilterPart.length >= 1) ? [] :
					(complexVideoFilterPart.length >= 1 || (extension === 'webm' && outExt === 'mp4' || compressionLevel !== 0)
					? [] : ['-c:v', 'copy'])
				),
				...(compressionArgs[compressionLevel]),
				`out.${outExt}`
			];
			console.log("Going to run", ffCommand);
				await runFFmpeg(ffCommand);
			}

			processState = ProcessingState.READING;
			const data = await ffmpeg.readFile(`out.${outExt}`);
			const blob = new Blob([(data as Uint8Array).buffer as BlobPart]);
			const downloadURL = URL.createObjectURL(blob);
			console.log(' ---- FINISHED ---- ');

			processState = ProcessingState.DONE;
			resultInfo = { elapsed: Date.now() - start, size: blob.size };

			console.timeEnd('ffmpeg');

			const a = document.createElement('a');
			a.href = downloadURL;
			a.download = `catcut_${basename}.${outExt}`;
			a.click();

			setTimeout(() => {
				URL.revokeObjectURL(downloadURL);
				a.remove();
			}, 100);
		} catch (e) {
			console.log('---- FAILED ----');
			console.timeEnd('ffmpeg');
			console.error('Failed to save video', e);
			processState = ProcessingState.ERROR;
		} finally {
			console.log(' ---- CLEANUP ---- ');
			await ffmpeg.deleteFile(`in.${extension}`).catch(() => {});
			await ffmpeg.deleteFile(`out.${outExt}`).catch(() => {});
		}
	}

	let currentTime = 0;
	let duration = 0;
	let paused = true;

	// Trim variables
	let trimStart = 0;
	let trimEnd = 0;
	$: if (duration) trimEnd = duration;
	$: if (trimStart < 0) trimStart = 0;
	$: if (trimStart > trimEnd) trimStart = trimEnd;
	$: if (trimEnd > duration) trimEnd = duration;

	// Seek at the trimmed start
	$: if (currentTime < trimStart) seek(trimStart);

	// Stop at the trimmed end
	$: if (currentTime > trimEnd) {
		seek(trimEnd);
		video.pause();
	}

	$: willBeTrimmed = trimStart !== 0 || trimEnd !== duration;

	// Trim handle variables
	let trimStartHandleDragOffset = -1;
	let trimEndHandleDragOffset = -1;
	let trimStartHandle: HTMLButtonElement;
	let trimEndHandle: HTMLButtonElement;
	let trimEventBounce = false;
	let showTrimHandles = false;
	$: isDraggingTrimHandle = trimStartHandleDragOffset >= 0 || trimEndHandleDragOffset >= 0;
	$: handleDistance = ((trimEnd - trimStart) / duration) * timelineWidth;

	// Video variables
	let video: HTMLVideoElement;
	let videoWidth: number;
	let videoHeight: number;
	let videoVolume = 1;

	// Timeline variables
	let timelineElement: HTMLButtonElement;
	let timelineWidth = 0;
	let hoveredTime = -1;

	// Resize variables
	let resizeWidth = 0;
	let resizeHeight = 0;

	// Cropping variables
	let cropX = 0;
	let cropY = 0;
	let cropWidth: number;
	let cropHeight: number;
	let showCropHandles = false;

	let playerWidth: number;
	let playerHeight: number;

	$: if (cropWidth === undefined && videoWidth) cropWidth = videoWidth;
	$: if (cropHeight === undefined && videoHeight) cropHeight = videoHeight;
	$: willCrop = cropX !== 0 || cropY !== 0 || cropWidth !== videoWidth || cropHeight !== videoHeight;

	// Filter variables
	let volume = 1;
	let volumeMode = 0;
	let loudnormArgs = [-24, 7, -2];
	$: videoVolume = volume <= 1 && volumeMode === 0 ? volume : 1;
	let toExtension: string | null = null;
	$: cantTrimReencode = extension === 'webm';
	let trimReencoding = false;
	let compressionLevel = 0;
	let bitrate = 0;
	let speedFactor = 1;
	let keepPitch: boolean = false;
	let semitoneFactor: number = 0;

	const editorComponents: Record<
		string,
		{
			name: string;
			icon: IconifyIcon;
			onShow?(): void;
			onHide?(): void;
			onOpen?(): void;
			onClose?(): void;
		}
	> = {
		trim: {
			name: 'Trim',
			icon: trimIcon,
			onShow() {
				showTrimHandles = true;
			},
			onHide() {
				showTrimHandles = false;
			},
			onClose() {
				trimStart = 0;
				trimEnd = duration;
				showTrimHandles = false;
			}
		},
		crop: {
			name: 'Crop',
			icon: cropIcon,
			onShow() {
				showCropHandles = true;
			},
			onHide() {
				showCropHandles = false;
			},
			onClose() {
				cropX = 0;
				cropY = 0;
				cropWidth = videoWidth;
				cropHeight = videoHeight;
				showCropHandles = false;
			}
		},
		resize: {
			name: 'Resize',
			icon: resizeIcon,
			onClose() {
				resizeHeight = 0;
				resizeWidth = 0;
			}
		},
		volume: {
			name: 'Volume',
			icon: volumeIcon,
			onClose() {
				volume = 1;
				volumeMode = 0;
				loudnormArgs = [-24, 7, -2];
			}
		},
		convert: {
			name: 'Convert',
			icon: convertIcon,
			onClose() {
				toExtension = null;
			}
		},
		compress: {
			name: 'Compress',
			icon: compressIcon,
			onClose() {
				compressionLevel = 0;
			}
		},
		speed: {
			name: 'Speed/Pitch',
			icon: speedIcon,
			onClose() {
				speedFactor = 0;
			}
		},
		bitrate: {
			name: 'Bitrate',
			icon: bitrateIcon,
			onClose() {
				bitrate = 0;
			}
		},

	};

	function onKeyPress(e: KeyboardEvent) {
		if (
			document.activeElement &&
			['A', 'BUTTON', 'INPUT'].includes(document.activeElement.tagName) &&
			document.activeElement !== timelineElement &&
			!timelineElement.contains(document.activeElement)
		)
			return;

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
			if (video.currentTime >= trimEnd - 0.001) video.currentTime = trimStart;

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
			const newTime =
				((e.clientX - (timelineBox.left + trimStartHandleDragOffset)) / timelineBox.width) *
				duration;
			trimStart = Math.max(0, Math.min(duration, newTime));
			seek(trimStart);
		} else if (trimEndHandleDragOffset >= 0) {
			const newTime =
				((e.clientX - (timelineBox.left + trimEndHandleDragOffset)) / timelineBox.width) * duration;
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
			<button class="transition-colors hover:text-red-400" on:click={() => dispatch('close')}>
				close
			</button>
			{#if isRemote}
				<a href={blobURL} download={file.name} class="transition-colors hover:text-violet-400">
					download
				</a>
			{/if}
		</div>
	</div>

	<!-- svelte-ignore a11y-media-has-caption -->
	<div class="bg-neutral-900/25">
		<div
			class="mx-auto w-fit relative"
			bind:clientWidth={playerWidth}
			bind:clientHeight={playerHeight}
		>
			<video
				src={blobURL}
				crossorigin="anonymous"
				playsinline
				disablepictureinpicture
				disableremoteplayback
				x-webkit-airplay="deny"
				class="max-h-[40svh]"
				bind:volume={videoVolume}
				bind:currentTime
				bind:duration
				bind:paused
				bind:videoHeight
				bind:videoWidth
				bind:this={video}
			/>

			<CropHandler
				show={showCropHandles} {video}
				{cropX} {cropY} {cropWidth} {cropHeight}
				{videoWidth} {videoHeight} {playerWidth} {playerHeight}
				on:set={(e) => {
					if (e.detail.x !== undefined && !isNaN(e.detail.x)) cropX = e.detail.x;
					if (e.detail.y !== undefined && !isNaN(e.detail.y)) cropY = e.detail.y;
					if (e.detail.w !== undefined && !isNaN(e.detail.w)) cropWidth = e.detail.w;
					if (e.detail.h !== undefined && !isNaN(e.detail.h)) cropHeight = e.detail.h;
				}}
			/>
		</div>
	</div>

	<div class="flex justify-center sm:flex-row flex-col gap-2 relative">
		<div class="flex justify-center gap-2">
			<PlayerButton icon={skipPreviousIcon} title="Seek to beginning" on:click={() => seek(0)} />
			<PlayerButton icon={back10Icon} title="Rewind 10 seconds" on:click={() => seekBy(-10)} />
			<PlayerButton
				icon={paused ? playIcon : pauseIcon}
				title={paused ? 'Play' : 'Pause'}
				on:click={onPlaybackToggle}
			/>
			<PlayerButton
				icon={forward10Icon}
				title="Fast forward 10 seconds"
				on:click={() => seekBy(10)}
			/>
			<PlayerButton icon={skipNextIcon} title="Seek to end" on:click={() => seek(duration)} />
		</div>
		<div class="flex justify-center gap-2 sm:absolute right-0">
			<ScreenshotButtons
				{video} {basename} {willCrop}
				{cropX} {cropY}
				{cropWidth} {cropHeight}
			/>
		</div>
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
					hoveredTime = Math.max(
						0,
						Math.min(duration, ((e.clientX - timelineBox.left) / timelineBox.width) * duration)
					);
				}
			}}
			on:mouseleave={() => (hoveredTime = -1)}
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
			<div
				class="bg-black/75 h-full absolute top-0 left-0 pointer-events-none"
				style:width={`${(trimStart / duration) * 100}%`}
			/>
			<div
				class="bg-black/75 h-full absolute top-0 right-0 pointer-events-none"
				style:width={`${((duration - trimEnd) / duration) * 100}%`}
			/>

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
			<div
				class="w-px h-full text-center absolute top-0 pointer-events-none"
				style:left={`${((trimStart + (trimEnd - trimStart) / 2) / duration) * 100}%`}
			>
				<div class="flex justify-center h-full relative">
					<code
						class="absolute top-full text-white/50 px-1 rounded text-xs transition-opacity"
						class:opacity-0={!willBeTrimmed || handleDistance < 140}
					>
						{ms((trimEnd - trimStart) * 1000, MS_OPTIONS)}
					</code>
				</div>
			</div>

			<!-- Hovered Time -->
			{#if hoveredTime >= 0}
				<div
					class="w-px h-full bg-white/25 text-center absolute top-0 pointer-events-none"
					style:left={`${(hoveredTime / duration) * 100}%`}
				>
					<div class="flex justify-center relative">
						<code class="absolute bottom-full text-white/25 px-1 rounded text-xs">
							{ms(hoveredTime * 1000, MS_OPTIONS)}
						</code>
					</div>
				</div>
			{/if}

			<!-- Current Time -->
			<div
				class="w-px h-full bg-white text-center absolute top-0 pointer-events-none"
				style:left={`${(currentTime / duration) * 100}%`}
			>
				<div class="flex justify-center relative">
					<code class="absolute bottom-full text-black bg-white px-1 rounded text-xs font-bold">
						{ms(currentTime * 1000, MS_OPTIONS)}
					</code>
				</div>
			</div>
		</button>

		<label class="flex justify-between pointer-events-none select-none" for="timeline">
			<code class="transition-opacity" class:opacity-0={willBeTrimmed}>
				{ms(trimStart * 1000, MS_OPTIONS)}
			</code>
			<code class="transition-opacity" class:opacity-0={willBeTrimmed}>
				{ms(trimEnd * 1000, MS_OPTIONS)}
			</code>
		</label>
	</div>

	<EditorTabs
		tabs={Object.keys(editorComponents).map((id) => ({
			id,
			name: editorComponents[id].name,
			icon: editorComponents[id].icon
		}))}
		on:showtab={(e) => editorComponents[e.detail]?.onShow?.()}
		on:hidetab={(e) => editorComponents[e.detail]?.onHide?.()}
		on:opentab={(e) => editorComponents[e.detail]?.onOpen?.()}
		on:closetab={(e) => editorComponents[e.detail]?.onClose?.()}
		on:save={saveVideo}
		let:tab
	>
		{#if tab === 'trim'}
			<Trim
				{trimStart} {trimEnd}
				{duration} {currentTime}
				{trimReencoding} {cantTrimReencode}
				on:setstart={(e) => (trimStart = e.detail)}
				on:setend={(e) => (trimEnd = e.detail)}
				on:setreencoding={(e) => (trimReencoding = e.detail)}
			/>
		{:else if tab === 'volume'}
			<Volume
				{volume} {volumeMode} {loudnormArgs}
				on:set={(e) => (volume = e.detail)}
				on:setmode={(e) => (volumeMode = e.detail)}
				on:setloudnorm={(e) => (loudnormArgs = e.detail)}
			/>
		{:else if tab === 'resize'}
			<Resize
				{resizeWidth} {resizeHeight}
				on:set={(e) => {
					if (e.detail.w !== undefined) resizeWidth = e.detail.w;
					if (e.detail.h !== undefined) resizeHeight = e.detail.h;
				}}
			/>
		{:else if tab === 'convert'}
			<Convert {toExtension} {extension} on:set={(e) => (toExtension = e.detail)} />
		{:else if tab === 'compress'}
			<Compress {compressionLevel} on:set={(e) => (compressionLevel = e.detail)} />
		{:else if tab === 'bitrate'}
			<Bitrate {bitrate} on:set={(e) => (bitrate = e.detail)} />
		{:else if tab === 'crop'}
			<Crop
				{cropX} {cropY}
				{cropWidth} {cropHeight}
				{videoWidth} {videoHeight}
				on:set={(e) => {
					if (e.detail.x !== undefined) cropX = e.detail.x;
					if (e.detail.y !== undefined) cropY = e.detail.y;
					if (e.detail.w !== undefined) cropWidth = e.detail.w;
					if (e.detail.h !== undefined) cropHeight = e.detail.h;
				}}
			/>
		{:else if tab === 'speed'}
			<Speed
				{semitoneFactor} {keepPitch} {speedFactor}
				on:set={(e) => {
					if (e.detail.s !== undefined) speedFactor = e.detail.s;
					if (e.detail.t !== undefined) semitoneFactor = e.detail.t;
				}}
				on:setKeepPitch={(e) => keepPitch = e.detail}
			/>
		{/if}
	</EditorTabs>
</section>

<!-- Processing Modal -->
<ProcessingModal
	open={modalOpen}
	{processState}
	{resultInfo}
	{speedFactor}
	on:close={() => (modalOpen = false)}
/>
