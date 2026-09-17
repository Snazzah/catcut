import {
	ALL_FORMATS,
	AudioBufferSink,
	BlobSource,
	CanvasSink,
	getDecodableCodecs,
	getEncodableCodecs,
	Input,
	UrlSource,
	type MediaCodec,
	type MetadataTags,
	type WrappedAudioBuffer,
	type WrappedCanvas
} from 'mediabunny';
import type { MediaSource } from '$lib/media';

import { registerAacEncoder } from '@mediabunny/aac-encoder';
import { registerAc3Decoder, registerAc3Encoder } from '@mediabunny/ac3';
import { registerDtsDecoder, registerDtsEncoder } from '@mediabunny/dts';
import { registerFlacEncoder } from '@mediabunny/flac-encoder';
import { registerMp3Encoder } from '@mediabunny/mp3-encoder';
import { registerProresDecoder } from '@mediabunny/prores';
import soundTouchProcessorUrl from '@soundtouchjs/audio-worklet/processor?url';
import type { SoundTouchNode } from '@soundtouchjs/audio-worklet';

export type CodecRegistration = {
	nativelyDecodable: ReadonlySet<MediaCodec>;
	nativelyEncodable: ReadonlySet<MediaCodec>;
};

let codecRegistration: Promise<CodecRegistration> | null = null;

export function registerAllCodecs() {
	codecRegistration ??= registerCodecs();
	return codecRegistration;
}

async function registerCodecs(): Promise<CodecRegistration> {
	const [decodable, encodable] = await Promise.all([getDecodableCodecs(), getEncodableCodecs()]);
	const nativelyDecodable = new Set(decodable);
	const nativelyEncodable = new Set(encodable);

	registerAc3Decoder();
	registerDtsDecoder();
	registerProresDecoder();

	registerDtsEncoder();
	registerAc3Encoder();
	if (!nativelyEncodable.has('aac')) registerAacEncoder();
	if (!nativelyEncodable.has('flac')) registerFlacEncoder();
	if (!nativelyEncodable.has('mp3')) registerMp3Encoder();

	return { nativelyDecodable, nativelyEncodable };
}

const SCRUB_PREVIEW_DEBOUNCE_MS = 100;
const FRAME_STEP_EPSILON_SECONDS = 0.00001;

type PlayerMetadata = {
	tags: MetadataTags;
};

export type PlayerLoadState =
	{ status: 'loading' } | { status: 'ready'; metadata: PlayerMetadata; warning: string | null };

export class PlayerState {
	readonly source: MediaSource;
	loadState = $state.raw<PlayerLoadState>({ status: 'loading' });
	currentTime = $state(0);
	paused = $state(true);
	volume = $state(0.7);
	playbackRate = $state(1);
	muted = $state(false);
	coverImageUrl = $state<string | null>(null);
	disposed = false;

	input: Input | null = null;
	#canvas: HTMLCanvasElement | null = null;
	#context: CanvasRenderingContext2D | null = null;
	#videoSink: CanvasSink | null = null;
	#scrubPreviewSink: CanvasSink | null = null;
	#audioSink: AudioBufferSink | null = null;
	#audioContext: AudioContext | null = null;
	#soundTouchNode: SoundTouchNode | null = null;
	#soundTouchNodeFactory: (() => SoundTouchNode) | null = null;
	#gainNode: GainNode | null = null;
	#firstTimestamp = 0;
	#endTimestamp = 0;
	#relativeToUnixEpoch = false;
	#audioContextStartTime: number | null = null;
	#playbackTimeAtStart = 0;
	#videoFrameIterator: AsyncGenerator<WrappedCanvas, void, unknown> | null = null;
	#audioBufferIterator: AsyncGenerator<WrappedAudioBuffer, void, unknown> | null = null;
	#nextFrame: WrappedCanvas | null = null;
	#lastDrawnFrame: Pick<WrappedCanvas, 'timestamp' |'duration'> | null = null;
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	#queuedAudioNodes = new Set<AudioBufferSourceNode>();
	#asyncId = 0;
	#animationFrameId: number | null = null;
	#backgroundRenderId: number | null = null;
	#scrubPreviewTime: number | null = null;
	#scrubPreviewTimer: number | null = null;
	#scrubPreviewTask: Promise<void> | null = null;
	#scrubPreviewId = 0;
	#frameStepTask: Promise<void> | null = null;
	#mediaSession: MediaSession | null = null;
	#mediaSessionArtworkUrl: string | null = null;

	constructor(source: MediaSource) {
		this.source = source;
	}

	get filename() {
		return this.source.origin === 'local' ? this.source.file.name : this.source.name;
	}

	get startTime() {
		return this.#firstTimestamp;
	}

	get endTime() {
		return this.#endTimestamp;
	}

	get duration() {
		return Math.max(0, this.#endTimestamp - this.#firstTimestamp);
	}

	get progress() {
		return this.duration > 0 ? (this.currentTime - this.#firstTimestamp) / this.duration : 0;
	}

	get hasAudio() {
		return this.loadState.status === 'ready' && this.#audioSink !== null;
	}

	get hasVideo() {
		return this.loadState.status === 'ready' && this.#videoSink !== null
	}

	attachCanvas(canvas: HTMLCanvasElement) {
		const context = canvas.getContext('2d');
		if (!context) throw new Error('This browser does not support 2D canvas rendering.');

		this.#canvas = canvas;
		this.#context = context;
		this.#animationFrameId = requestAnimationFrame(this.#render);
		this.#backgroundRenderId = window.setInterval(() => this.#renderFrame(), 500);
	}

	async load() {
		await registerAllCodecs();
		this.loadState = { status: 'loading' };

		const input = new Input({
			formats: ALL_FORMATS,
			source:
				this.source.origin === 'local'
					? new BlobSource(this.source.file)
					: new UrlSource(this.source.url)
		});
		this.input = input;

		// Get tracks
		const [primaryVideoTrack, primaryAudioTrack, tags] = await Promise.all([
			input.getPrimaryVideoTrack(),
			input.getPrimaryAudioTrack(),
			input.getMetadataTags()
		]);
		let videoTrack = primaryVideoTrack;
		let audioTrack = primaryAudioTrack;
		if (!this.#isCurrent(input)) return;
		if (!videoTrack && !audioTrack) throw new Error('No audio or video track found.');

		// Get timestamps
		const tracks = [videoTrack, audioTrack].filter((track) => track !== null);
		const [firstTimestamp, endTimestamp, relativeFlags] = await Promise.all([
			input.getFirstTimestamp(tracks),
			input
				.getDurationFromMetadata(tracks, { skipLiveWait: true })
				.then((duration) => duration ?? input.computeDuration(tracks, { skipLiveWait: true })),
			Promise.all(tracks.map((track) => track.isRelativeToUnixEpoch()))
		]);
		if (!this.#isCurrent(input)) return;

		this.#firstTimestamp = Math.max(firstTimestamp, 0);
		this.#endTimestamp = Math.max(this.#firstTimestamp, endTimestamp);
		this.#relativeToUnixEpoch = relativeFlags.some(Boolean);
		this.#playbackTimeAtStart = this.#firstTimestamp;
		this.currentTime = this.#firstTimestamp;

		const warnings: string[] = [];
		if (videoTrack && ((await videoTrack.getCodec()) === null || !(await videoTrack.canDecode()))) {
			warnings.push('The video track cannot be decoded.');
			videoTrack = null;
		}
		if (audioTrack && ((await audioTrack.getCodec()) === null || !(await audioTrack.canDecode()))) {
			warnings.push('The audio track cannot be decoded.');
			audioTrack = null;
		}
		if (!this.#isCurrent(input)) return;
		if (!videoTrack && !audioTrack) throw new Error(warnings.join(' '));

		// Get track information
		const [video, audio] = await Promise.all([
			videoTrack
				? Promise.all([
						videoTrack.getCodec(),
						videoTrack.getDisplayWidth(),
						videoTrack.getDisplayHeight(),
						videoTrack.canBeTransparent()
					]).then(([codec, width, height, transparent]) =>
						codec === null ? null : { codec, width, height, transparent }
					)
				: null,
			audioTrack
				? Promise.all([
						audioTrack.getCodec(),
						audioTrack.getSampleRate(),
						audioTrack.getNumberOfChannels()
					]).then(([codec, sampleRate, channels]) =>
						codec === null ? null : { codec, sampleRate, channels }
					)
				: null
		]);
		if (!this.#isCurrent(input)) return;

		// Create the A/V sinks
		const audioContext = new AudioContext(audio ? { sampleRate: audio.sampleRate } : {});
		const gainNode = audioContext.createGain();
		if (audio) {
			const { SoundTouchNode } = await import('@soundtouchjs/audio-worklet');
			await SoundTouchNode.register(audioContext, soundTouchProcessorUrl);
			if (!this.#isCurrent(input)) {
				void audioContext.close();
				return;
			}
			this.#soundTouchNodeFactory = () => new SoundTouchNode({ context: audioContext });
		}
		gainNode.connect(audioContext.destination);
		this.#audioContext = audioContext;
		this.#gainNode = gainNode;
		this.#updateGain();

		this.#videoSink = videoTrack
			? new CanvasSink(videoTrack, {
					poolSize: 2,
					fit: 'contain',
					alpha: video?.transparent ?? false
				})
			: null;
		this.#scrubPreviewSink = videoTrack
			? new CanvasSink(videoTrack, {
					poolSize: 1,
					fit: 'contain',
					alpha: video?.transparent ?? false
				})
			: null;
		this.#audioSink = audioTrack ? new AudioBufferSink(audioTrack) : null;

		if (video && this.#canvas) {
			this.#canvas.width = video.width;
			this.#canvas.height = video.height;
		}

		this.loadState = {
			status: 'ready',
			metadata: { tags },
			warning: warnings.length > 0 ? warnings.join(' ') : null
		};

		this.#initializeMediaSession(tags);
		const artworkSink = videoTrack
			? new CanvasSink(videoTrack, { width: 512, height: 512, fit: 'cover' })
			: null;
		void this.#loadMediaSessionArtwork(tags, artworkSink, input).catch(() => {});
		await this.#restartVideoIterator();
	}

	async togglePlayback() {
		if (this.paused) await this.play();
		else this.pause();
	}

	async play() {
		const audioContext = this.#audioContext;
		if (!audioContext || this.loadState.status !== 'ready' || !this.paused) return;

		if (audioContext.state === 'suspended') await audioContext.resume();
		if (this.#getPlaybackTime() >= this.#endTimestamp) {
			this.#playbackTimeAtStart = this.#firstTimestamp;
			this.currentTime = this.#firstTimestamp;
			await this.#restartVideoIterator();
		}
		if (this.disposed) return;

		this.#audioContextStartTime = audioContext.currentTime;
		this.paused = false;
		this.#ensureSoundTouchNode();
		this.#updateMediaSessionState();

		if (this.#audioSink) {
			void this.#audioBufferIterator?.return();
			const iterator = this.#audioSink.buffers(this.#getPlaybackTime());
			this.#audioBufferIterator = iterator;
			void this.#runAudioIterator(iterator);
		}
	}

	pause() {
		if (this.paused) return;

		this.#playbackTimeAtStart = Math.min(this.#getPlaybackTime(), this.#endTimestamp);
		this.currentTime = this.#playbackTimeAtStart;
		this.paused = true;
		void this.#audioBufferIterator?.return();
		this.#audioBufferIterator = null;
		this.#stopQueuedAudio();
		this.#disconnectSoundTouchNode();
		this.#updateMediaSessionState();
	}

	async seek(seconds: number) {
		if (this.loadState.status !== 'ready') return;

		const target = Math.max(this.#firstTimestamp, Math.min(seconds, this.#endTimestamp));
		const wasPlaying = !this.paused;
		if (wasPlaying) this.pause();

		this.#playbackTimeAtStart = target;
		this.currentTime = target;
		this.#updateMediaSessionPosition();
		const current = await this.#restartVideoIterator();
		if (current && wasPlaying && target < this.#endTimestamp) await this.play();
	}

	stepFrame(direction: -1 | 1) {
		if (this.#frameStepTask) return this.#frameStepTask;

		const promise = this.#stepFrame(direction).finally(() => (this.#frameStepTask = null));
		this.#frameStepTask = promise;
		return promise;
	}

	async #stepFrame(direction: -1 | 1) {
		if (this.loadState.status !== 'ready' || !this.#lastDrawnFrame || !this.paused) return;

		const target = direction === -1 ?
			this.#lastDrawnFrame.timestamp - FRAME_STEP_EPSILON_SECONDS
			: this.#lastDrawnFrame.timestamp + this.#lastDrawnFrame.duration;

		if (target < this.#firstTimestamp || target >= this.#endTimestamp) return;

		if (direction === -1) {
			await this.seek(target);
			return;
		}

		// Manually draw the next frame, its not entirely ideal (with restaring the iterator n stuff) but it works
		const frame = (await this.#scrubPreviewSink?.getCanvas(target)) ?? null;
		if (!frame || this.disposed) return;

		this.#playbackTimeAtStart = target;
		this.currentTime = target;
		this.#updateMediaSessionPosition();
		await this.#restartVideoIterator();
		if (this.disposed) return;
		this.#draw(frame);
	}

	beginScrub() {
		const resumeAfterScrub = !this.paused;
		if (resumeAfterScrub) this.pause();
		return resumeAfterScrub;
	}

	previewScrub(seconds: number) {
		if (this.loadState.status !== 'ready') return;

		const target = this.#clampTime(seconds);
		this.#playbackTimeAtStart = target;
		this.currentTime = target;
		this.#updateMediaSessionPosition();
		this.#scrubPreviewTime = target;
		if (this.#scrubPreviewTimer !== null) window.clearTimeout(this.#scrubPreviewTimer);
		this.#scrubPreviewTimer = window.setTimeout(() => {
			this.#scrubPreviewTimer = null;
			this.#startScrubPreview();
		}, SCRUB_PREVIEW_DEBOUNCE_MS);
	}

	async endScrub(seconds: number, resumeAfterScrub: boolean) {
		if (this.loadState.status !== 'ready') return;

		const target = this.#clampTime(seconds);
		this.#playbackTimeAtStart = target;
		this.currentTime = target;
		this.#updateMediaSessionPosition();
		this.#cancelScrubPreview();
		const current = await this.#restartVideoIterator();
		if (current && resumeAfterScrub && target < this.#endTimestamp) await this.play();
	}

	setVolume(volume: number) {
		this.volume = Math.max(0, Math.min(volume, 1));
		this.muted = false;
		this.#updateGain();
	}

	setPlaybackRate(playbackRate: number) {
		const nextPlaybackRate = Math.max(0.25, Math.min(playbackRate, 2));
		if (nextPlaybackRate === this.playbackRate) return;

		if (!this.paused) {
			this.#playbackTimeAtStart = Math.min(this.#getPlaybackTime(), this.#endTimestamp);
			this.currentTime = this.#playbackTimeAtStart;
			this.#audioContextStartTime = this.#audioContext?.currentTime ?? null;
		}

		this.playbackRate = nextPlaybackRate;
		this.#disconnectSoundTouchNode();
		if (!this.paused) this.#ensureSoundTouchNode();
		this.#updateMediaSessionPosition();

		if (!this.paused && this.#audioSink) {
			void this.#audioBufferIterator?.return();
			this.#stopQueuedAudio();
			const iterator = this.#audioSink.buffers(this.#playbackTimeAtStart);
			this.#audioBufferIterator = iterator;
			void this.#runAudioIterator(iterator);
		}
	}

	toggleMuted() {
		this.muted = !this.muted;
		this.#updateGain();
	}

	formatTimestamp(seconds: number) {
		if (this.#relativeToUnixEpoch) {
			// This Date is a one-off formatter value, not reactive state.
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			return new Date(seconds * 1000).toISOString().replace('T', ' ');
		}

		const rounded = Math.max(0, Math.floor(seconds - this.#firstTimestamp));
		const hours = Math.floor(rounded / 3600);
		const minutes = Math.floor((rounded % 3600) / 60);
		const remainingSeconds = rounded % 60;
		return hours > 0
			? `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
			: `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	}

	dispose() {
		if (this.disposed) return;

		this.disposed = true;
		this.#asyncId += 1;
		this.#cancelScrubPreview();
		this.pause();
		void this.#videoFrameIterator?.return();
		this.#videoFrameIterator = null;
		this.#nextFrame = null;
		this.#lastDrawnFrame = null;

		if (this.#animationFrameId !== null) cancelAnimationFrame(this.#animationFrameId);
		if (this.#backgroundRenderId !== null) clearInterval(this.#backgroundRenderId);
		this.#animationFrameId = null;
		this.#backgroundRenderId = null;

		this.#disconnectSoundTouchNode();
		this.#gainNode?.disconnect();
		void this.#audioContext?.close();
		this.#soundTouchNodeFactory = null;
		this.#gainNode = null;
		this.#audioContext = null;
		this.input?.dispose();
		this.input = null;
		this.#disposeMediaSession();
		this.#canvas = null;
		this.#context = null;
	}

	#getPlaybackTime() {
		if (!this.paused && this.#audioContextStartTime !== null && this.#audioContext) {
			return (
				(this.#audioContext.currentTime - this.#audioContextStartTime) * this.playbackRate +
				this.#playbackTimeAtStart
			);
		}
		return this.#playbackTimeAtStart;
	}

	async #restartVideoIterator() {
		const operationId = ++this.#asyncId;
		this.#cancelScrubPreview();
		await this.#videoFrameIterator?.return();
		if (operationId !== this.#asyncId || this.disposed || !this.#videoSink) return true;

		const iterator = this.#videoSink.canvases(this.#getPlaybackTime());
		this.#videoFrameIterator = iterator;
		const firstFrame = (await iterator.next()).value ?? null;
		if (operationId !== this.#asyncId || this.disposed) return false;
		const secondFrame = (await iterator.next()).value ?? null;
		if (operationId !== this.#asyncId || this.disposed) return false;

		this.#nextFrame = secondFrame;
		if (firstFrame) this.#draw(firstFrame)
		return true;
	}

	#render = () => {
		this.#renderFrame();
		if (!this.disposed) this.#animationFrameId = requestAnimationFrame(this.#render);
	};

	#renderFrame() {
		if (this.loadState.status !== 'ready') return;

		const playbackTime = this.#getPlaybackTime();
		if (playbackTime >= this.#endTimestamp) {
			this.pause();
			this.#playbackTimeAtStart = this.#endTimestamp;
			this.currentTime = this.#endTimestamp;
		} else {
			this.currentTime = playbackTime;
		}

		if (this.#nextFrame && this.#nextFrame.timestamp <= playbackTime) {
			this.#draw(this.#nextFrame);
			this.#nextFrame = null;
			void this.#updateNextFrame();
		}
	}

	async #updateNextFrame() {
		const operationId = this.#asyncId;
		const iterator = this.#videoFrameIterator;
		if (!iterator) return;

		while (operationId === this.#asyncId && !this.disposed) {
			const nextFrame = (await iterator.next()).value ?? null;
			if (!nextFrame || operationId !== this.#asyncId || this.disposed) return;

			if (nextFrame.timestamp <= this.#getPlaybackTime()) this.#draw(nextFrame);
			else {
				this.#nextFrame = nextFrame;
				return;
			}
		}
	}

	#draw(frame: WrappedCanvas) {
		const canvas = this.#canvas;
		const context = this.#context;
		if (!canvas || !context) return;

		context.clearRect(0, 0, canvas.width, canvas.height);
		context.drawImage(frame.canvas, 0, 0);
		this.#lastDrawnFrame = { timestamp: frame.timestamp, duration: frame.duration }
	}

	#startScrubPreview() {
		if (this.#scrubPreviewTask || !this.#scrubPreviewSink) return;

		const task = this.#renderScrubPreview();
		this.#scrubPreviewTask = task;
		void task.finally(() => {
			if (this.#scrubPreviewTask === task) this.#scrubPreviewTask = null;
			if (this.#scrubPreviewTime !== null && this.#scrubPreviewTimer === null && !this.disposed)
				this.#startScrubPreview();
		});
	}

	async #renderScrubPreview() {
		const previewId = this.#scrubPreviewId;
		const target = this.#scrubPreviewTime;
		this.#scrubPreviewTime = null;
		if (target === null) return;

		try {
			const frame = await this.#scrubPreviewSink?.getCanvas(target);
			if (previewId !== this.#scrubPreviewId || this.disposed) return;
			if (frame && this.#scrubPreviewTime === null) this.#draw(frame);
		} catch {}
	}

	#cancelScrubPreview() {
		this.#scrubPreviewId += 1;
		this.#scrubPreviewTime = null;
		if (this.#scrubPreviewTimer !== null) window.clearTimeout(this.#scrubPreviewTimer);
		this.#scrubPreviewTimer = null;
	}

	async #runAudioIterator(iterator: AsyncGenerator<WrappedAudioBuffer, void, unknown>) {
		const audioContext = this.#audioContext;
		const destinationNode = this.#soundTouchNode ?? this.#gainNode;
		const audioContextStartTime = this.#audioContextStartTime;
		const playbackTimeAtStart = this.#playbackTimeAtStart;
		if (!audioContext || !destinationNode || audioContextStartTime === null) return;

		for await (const { buffer, timestamp } of iterator) {
			if (iterator !== this.#audioBufferIterator || this.disposed) return;

			const node = audioContext.createBufferSource();
			node.buffer = buffer;
			node.playbackRate.value = this.playbackRate;
			node.connect(destinationNode);
			let startTimestamp =
				audioContextStartTime + (timestamp - playbackTimeAtStart) / this.playbackRate;
			startTimestamp =
				Math.round(audioContext.sampleRate * startTimestamp) / audioContext.sampleRate;

			if (startTimestamp >= audioContext.currentTime) node.start(startTimestamp);
			else
				node.start(
					audioContext.currentTime,
					(audioContext.currentTime - startTimestamp) * this.playbackRate
				);

			this.#queuedAudioNodes.add(node);
			node.onended = () => this.#queuedAudioNodes.delete(node);

			while (timestamp - this.#getPlaybackTime() >= 1) {
				await new Promise((resolve) => window.setTimeout(resolve, 100));
				if (iterator !== this.#audioBufferIterator || this.disposed) return;
			}
		}
	}

	#stopQueuedAudio() {
		for (const node of this.#queuedAudioNodes) node.stop();
		this.#queuedAudioNodes.clear();
	}

	#ensureSoundTouchNode() {
		if (this.playbackRate === 1 || this.#soundTouchNode) return;

		const createSoundTouchNode = this.#soundTouchNodeFactory;
		const gainNode = this.#gainNode;
		if (!createSoundTouchNode || !gainNode || !this.#audioSink) return;

		const soundTouchNode = createSoundTouchNode();
		soundTouchNode.playbackRate.value = this.playbackRate;
		soundTouchNode.connect(gainNode);
		this.#soundTouchNode = soundTouchNode;
	}

	#disconnectSoundTouchNode() {
		this.#soundTouchNode?.disconnect();
		this.#soundTouchNode?.port.close();
		this.#soundTouchNode = null;
	}

	#updateGain() {
		if (this.#gainNode) this.#gainNode.gain.value = this.muted ? 0 : this.volume ** 2;
	}

	#clampTime(seconds: number) {
		return Math.max(this.#firstTimestamp, Math.min(seconds, this.#endTimestamp));
	}

	#initializeMediaSession(tags: MetadataTags) {
		if (!('mediaSession' in navigator)) return;

		const mediaSession = navigator.mediaSession;
		this.#mediaSession = mediaSession;
		this.#setMediaSessionMetadata(tags);
		this.#setMediaSessionAction('play', () => void this.play());
		this.#setMediaSessionAction('pause', () => this.pause());
		this.#setMediaSessionAction('stop', () => {
			this.pause();
			void this.seek(this.#firstTimestamp);
		});
		this.#setMediaSessionAction('seekbackward', (details) => {
			void this.seek(this.currentTime - (details.seekOffset ?? 10));
		});
		this.#setMediaSessionAction('seekforward', (details) => {
			void this.seek(this.currentTime + (details.seekOffset ?? 10));
		});
		this.#setMediaSessionAction('seekto', (details) => {
			if (details.seekTime === undefined) return;
			void this.seek(this.#firstTimestamp + details.seekTime);
		});
		this.#updateMediaSessionState();
	}

	async #loadMediaSessionArtwork(tags: MetadataTags, artworkSink: CanvasSink | null, input: Input) {
		let blob: Blob | null = null;
		const embeddedImage =
			tags.images?.find((image) => image.kind === 'coverFront') ?? tags.images?.[0];

		if (embeddedImage) {
			const data = new Uint8Array(embeddedImage.data.byteLength);
			data.set(embeddedImage.data);
			blob = new Blob([data], { type: embeddedImage.mimeType });
		} else if (artworkSink && Number.isFinite(this.duration) && this.duration > 0) {
			const midpoint = this.#firstTimestamp + this.duration / 2;
			const frame = await artworkSink.getCanvas(midpoint);
			if (frame) blob = await this.#canvasToBlob(frame.canvas);
		}

		if (!blob || !this.#isCurrent(input) || (!embeddedImage && !this.#mediaSession)) return;

		const url = URL.createObjectURL(blob);
		if (!this.#isCurrent(input)) {
			URL.revokeObjectURL(url);
			return;
		}

		if (this.#mediaSessionArtworkUrl) URL.revokeObjectURL(this.#mediaSessionArtworkUrl);
		this.#mediaSessionArtworkUrl = url;
		this.coverImageUrl = embeddedImage ? url : null;
		if (this.#mediaSession) this.#setMediaSessionMetadata(tags, { src: url, type: blob.type });
	}

	#canvasToBlob(canvas: HTMLCanvasElement | OffscreenCanvas) {
		if (canvas instanceof HTMLCanvasElement) {
			return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
		}
		return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
	}

	// #region Media Session API

	#setMediaSessionMetadata(tags: MetadataTags, artwork?: MediaImage) {
		if (!this.#mediaSession || typeof MediaMetadata === 'undefined') return;

		this.#mediaSession.metadata = new MediaMetadata({
			title: tags.title ?? this.filename,
			artist: tags.artist ?? tags.albumArtist,
			album: tags.album,
			artwork: artwork ? [artwork] : []
		});
	}

	#setMediaSessionAction(action: MediaSessionAction, handler: MediaSessionActionHandler | null) {
		if (!this.#mediaSession) return;

		try {
			this.#mediaSession.setActionHandler(action, handler);
		} catch {}
	}

	#updateMediaSessionState() {
		if (!this.#mediaSession) return;

		this.#mediaSession.playbackState = this.paused ? 'paused' : 'playing';
		this.#updateMediaSessionPosition();
	}

	#updateMediaSessionPosition() {
		if (!this.#mediaSession || !Number.isFinite(this.duration) || this.duration <= 0) return;

		const position = Math.max(0, Math.min(this.currentTime - this.#firstTimestamp, this.duration));
		try {
			this.#mediaSession.setPositionState({
				duration: this.duration,
				playbackRate: this.playbackRate,
				position
			});
		} catch {}
	}

	#disposeMediaSession() {
		if (this.#mediaSession) {
			for (const action of [
				'play',
				'pause',
				'stop',
				'seekbackward',
				'seekforward',
				'seekto'
			] satisfies MediaSessionAction[]) {
				this.#setMediaSessionAction(action, null);
			}
			this.#mediaSession.metadata = null;
			this.#mediaSession.playbackState = 'none';
			try {
				this.#mediaSession.setPositionState();
			} catch {}
		}

		this.#mediaSession = null;
		if (this.#mediaSessionArtworkUrl) URL.revokeObjectURL(this.#mediaSessionArtworkUrl);
		this.#mediaSessionArtworkUrl = null;
		this.coverImageUrl = null;
	}

	// #endregion

	#isCurrent(input: Input) {
		return !this.disposed && input === this.input;
	}
}
