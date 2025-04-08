<script lang="ts">
	import { ProcessingState, RemoteFile, splitFilename, validEvent } from '$lib/util';
	import { filesize } from 'filesize';
	import ms from 'pretty-ms';
	import type { Tags } from 'jsmediatags/types';
	import { createEventDispatcher } from 'svelte';
	import speedIcon from '@iconify-icons/mdi/speedometer-slow';
	import playIcon from '@iconify-icons/mdi/play-arrow';
	import pauseIcon from '@iconify-icons/mdi/pause';
	import back10Icon from '@iconify-icons/mdi/rewind-10';
	import forward10Icon from '@iconify-icons/mdi/fast-forward-10';
	import skipNextIcon from '@iconify-icons/mdi/skip-next';
	import skipPreviousIcon from '@iconify-icons/mdi/skip-previous';
	import trimIcon from '@iconify-icons/mdi/content-cut';
	import volumeIcon from '@iconify-icons/mdi/volume-high';
	import bitrateIcon from '@iconify-icons/mdi/music-note';
	import convertIcon from '@iconify-icons/mdi/file-arrow-left-right';
	import metadataIcon from '@iconify-icons/mdi/card-text';
	import PlayerButton from '$lib/components/PlayerButton.svelte';
	import type { IconifyIcon } from '@iconify/svelte';
	import { MS_OPTIONS } from '$lib/util';
	import { ffmpeg } from '$lib/ffmpeg';
	import EditorTabs from '$lib/components/EditorTabs.svelte';
	import { fetchFile } from '@ffmpeg/util';
	import ProcessingModal from './ProcessingModal.svelte';
	import Trim from '$lib/components/audio/Trim.svelte';
	import Waveform from './Waveform.svelte';
	import Bitrate from '$lib/components/common/Bitrate.svelte';
	import Volume from '$lib/components/common/Volume.svelte';
	import Convert from '$lib/components/audio/Convert.svelte';
	import Metadata from '$lib/components/audio/Metadata.svelte';
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

	async function save() {
		processState = ProcessingState.WRITING;
		modalOpen = true;
		resultInfo = null;
		const outExt = toExtension ?? extension;
		const coverExt = changedCover instanceof File ? changedCover.type.split('/')[1] : null;

		try {
			window.plausible?.('File saved', { props: { extension } })
		} catch (e) { /** */ }

		try {
			console.time('ffmpeg');
			await ffmpeg.writeFile(
				`in.${extension}`,
				await fetchFile(file instanceof RemoteFile ? file.blob : file)
			);
			if (coverExt) await ffmpeg.writeFile(`cover.${coverExt}`, await fetchFile(changedCover!));
			processState = ProcessingState.RUNNING;
			const start = Date.now();

			const complexPitchSpeedAudioCommand = generatePitchSpeedAudioCommand(speedFactor, keepPitch, semitoneFactor);
			const volumeFilter = (volume !== 1 || volumeMode !== 0) && volumeMode === 0 ? `volume=${volume.toFixed(2)}` : '';
			const loudNormFilter = (volume !== 1 || volumeMode !== 0) && volumeMode === 1 ? `loudnorm=I=${loudnormArgs[0].toFixed(2)}:LRA=${loudnormArgs[1].toFixed(2)}:TP=${loudnormArgs[2].toFixed(2)}` : '';
			const complexAudioFilterPart = [volumeFilter, loudNormFilter, complexPitchSpeedAudioCommand].filter(v=>!!v);
			const allComplexFilters: string[] = [];
			if(complexAudioFilterPart.length >= 1) {
				allComplexFilters.push(`[0:a]${complexAudioFilterPart.join(',')}[a]`);
			}
			const complexFilter: string = allComplexFilters.length >= 1 ? allComplexFilters.join(';') : '';

			console.log(' ---- RUNNING FFmpeg ---- ');

			const bitrateChanged = bitrate > 0;

			await runFFmpeg([
				'-i', `in.${extension}`,
				...(coverExt ? [
					'-i', `cover.${coverExt}`,
					'-map', '0:0',
					'-map', '1:0',
					'-id3v2_version', '3',
					'-metadata:s:v', 'title=Album cover',
					'-metadata:s:v', 'comment=Cover (front)'
				] : changedCover === '' ? ['-vn'] : []),
				...(willBeTrimmed ? [
					'-ss', ms(trimStart * 1000, MS_OPTIONS),
					'-t', ms((trimEnd - trimStart) * 1000, MS_OPTIONS)
				] : []),
				...(complexFilter ? ['-filter_complex', complexFilter, '-map', '[a]'] : []),
				// ...((volume !== 1 || volumeMode !== 0)
				// 	? volumeMode === 0
				// 		? ['-af', `volume=${volume.toFixed(2)}`]
				// 		: ['-af', `loudnorm=I=${loudnormArgs[0].toFixed(2)}:LRA=${loudnormArgs[1].toFixed(2)}:TP=${loudnormArgs[2].toFixed(2)}`]
				// 	: []),
				...(bitrateChanged && volume !== 0 ? ['-b:a', `${bitrate}k`] : []),
				...Object.keys(metadata).map((t) => (['-metadata', `${t}=${metadata[t]?.replaceAll('"', '\\"')}`])).reduce((p, a) => [...p, ...a], []),
				`out.${outExt}`
			]);

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
			console.error('Failed to save audio', e);
			processState = ProcessingState.ERROR;
		} finally {
			console.log(' ---- CLEANUP ---- ');
			await ffmpeg.deleteFile(`in.${extension}`).catch(() => {});
			await ffmpeg.deleteFile(`out.${outExt}`).catch(() => {});
			if (coverExt) await ffmpeg.deleteFile(`cover.${coverExt}`).catch(() => {});
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
		audio.pause();
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
	let audio: HTMLAudioElement;
	let audioVolume = 1;

	// Timeline variables
	let timelineElement: HTMLButtonElement;
	let timelineWidth = 0;
	let hoveredTime = -1;

	// Filter variables
	let volume = 1;
	let volumeMode = 0;
	let loudnormArgs = [-24, 7, -2];
	$: audioVolume = volume <= 1 && volumeMode === 0 ? volume : 1;
	let toExtension: string | null = null;
	let bitrate = 0;

	// speed
	let keepPitch: boolean;
	let speedFactor: number = 1;
	let semitoneFactor: number = 0;

	// Metadata
	let metadata: Record<string, string> = {};
	let changedCover: null | '' | File = null;
	$: console.log(metadata, changedCover)

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
		speed: {
			name: 'Speed/Pitch',
			icon: speedIcon,
			onClose() {
				speedFactor = 1;
			}
		},
		bitrate: {
			name: 'Bitrate',
			icon: bitrateIcon,
			onClose() {
				bitrate = 0;
			}
		},
		metadata: {
			name: 'Metadata',
			icon: metadataIcon,
			onClose() {
				metadata = {};
				changedCover = null;
			}
		}
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
		audio.currentTime += by;
		currentTime = audio.currentTime;
	}

	function seek(by: number) {
		audio.currentTime = by;
		currentTime = audio.currentTime;
	}

	function onPlaybackToggle() {
		if (paused) {
			if (audio.currentTime >= trimEnd - 0.001) audio.currentTime = trimStart;

			// "wake up" the currentTime listener
			currentTime = 0;
			currentTime = audio.currentTime;

			audio.play();
		} else audio.pause();
	}

	let audioTags: Tags | null = null;
	let tagType: string | null = null;
	$: console.log(`Audio metadata (${tagType})`, audioTags);
	$: coverSrc = audioTags?.picture?.data ? `data:${audioTags.picture.format};charset=utf-8;base64,${btoa(String.fromCharCode.apply(null, audioTags.picture.data))}` : null;
	$: window.jsmediatags?.read(file instanceof RemoteFile ? file.blob! : file, {
		onSuccess: (tag) => {
			if (!tag.tags) return;
			audioTags = tag.tags;
			tagType = tag.type;
		},
		onError: (error) => console.error('Failed to parse audio with jsmediatags', error)
	});
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
			{#if audio}
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

	<audio
		src={blobURL}
		crossorigin="anonymous"
		playsinline
		disableremoteplayback
		x-webkit-airplay="deny"
		bind:volume={audioVolume}
		bind:currentTime
		bind:duration
		bind:paused
		bind:this={audio}
	/>

	{#if audioTags}
		<div class="flex flex-col md:flex-row justify-center items-center gap-4">
			{#if coverSrc}
				<img
					class="w-40 h-40 rounded bg-black/50 object-contain"
					src={coverSrc}
					alt={`${audioTags?.title} - ${audioTags?.artist}`}
				/>
			{/if}

			<div class={`flex flex-col text-center ${coverSrc ? 'md:text-left ' : ''}gap-2`}>
				{#if audioTags?.title}
					<h2 class="text-2xl md:text-3xl text-white font-bold">{audioTags?.title}</h2>
				{/if}
				<div class="flex flex-col text-lg md:text-2xl">
					{#if audioTags?.artist}
						<h5>{audioTags?.artist}</h5>
					{/if}
					{#if audioTags?.album}
						<h5>on {audioTags?.album}</h5>
					{/if}
				</div>
			</div>
		</div>
	{/if}

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

	<div class="flex flex-col w-full select-none">
		<!-- Timeline -->
		<button
			class="relative w-full h-24 bg-neutral-900 mt-6 outline-none transition-all ring-offset-1 ring-offset-neutral-950 ring-violet-400/50 focus:ring-2 cursor-default"
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
				audio.currentTime = hoveredTime;

				if (!showTrimHandles) return;
				if (hoveredTime > trimEnd) trimEnd = hoveredTime;
				else if (hoveredTime < trimStart) trimStart = hoveredTime;
			}}
			bind:this={timelineElement}
			bind:clientWidth={timelineWidth}
		>
			<!-- Preview Stills -->
			<Waveform {audio} {file} />
			<!-- <PreviewStillContainer {videoWidth} {videoHeight} {duration} src={blobURL} /> -->

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
		on:save={save}
		let:tab
	>
		{#if tab === 'trim'}
			<Trim
				{trimStart} {trimEnd} {duration} {currentTime}
				on:setstart={(e) => (trimStart = e.detail)}
				on:setend={(e) => (trimEnd = e.detail)}
			/>
		{:else if tab === 'volume'}
			<Volume
				{volume} {volumeMode} {loudnormArgs}
				on:set={(e) => (volume = e.detail)}
				on:setmode={(e) => (volumeMode = e.detail)}
				on:setloudnorm={(e) => (loudnormArgs = e.detail)}
			/>
		{:else if tab === 'convert'}
			<Convert {toExtension} {extension} on:set={(e) => (toExtension = e.detail)} />
		{:else if tab === 'speed'}
			<Speed
				{semitoneFactor} {keepPitch} {speedFactor}
				on:set={(e) => {
					if(e.detail.s !== undefined) speedFactor = e.detail.s;
					if(e.detail.t !== undefined) semitoneFactor = e.detail.t;
				}}
				on:setKeepPitch={(e) => keepPitch = e.detail}
			/>
		{:else if tab === 'bitrate'}
			<Bitrate {bitrate} on:set={(e) => (bitrate = e.detail)} />
		{:else if tab === 'metadata'}
			<Metadata tags={audioTags} {basename} on:set={(e) => {
				if (e.detail[0] === 'cover') return changedCover = e.detail[1];
				if (e.detail[1] === null) metadata = Object.keys(metadata).filter((t) => t !== e.detail[0]).reduce((p, t) => ({ ...p, [t]: metadata[t] }), {});
				else metadata = { ...metadata, [e.detail[0]]: e.detail[1] };
			}} />
		{/if}
	</EditorTabs>
</section>

<!-- Processing Modal -->
<ProcessingModal
	open={modalOpen}
	{processState}
	{resultInfo}
	on:close={() => (modalOpen = false)}
/>
