import { AudioBufferSink, CanvasSink, type InputAudioTrack } from 'mediabunny';
import type { PlayerState } from '$lib/player-state.svelte';

type TimelinePreviewOptions = {
	player: PlayerState;
	canvas: HTMLCanvasElement;
	width: number;
	height: number;
	signal: AbortSignal;
};

type TimelineTileLayout = Readonly<{
	width: number;
	count: number;
}>;

type WaveformPeaks = Readonly<{
	top: Float32Array;
	bottom: Float32Array;
}>;

type WaveformEnvelope = {
	top: Float32Array;
	bottom: Float32Array | null;
};

type WaveformCacheEntry = Readonly<{
	envelope: WaveformEnvelope;
	abortController: AbortController;
	listeners: Set<() => void>;
	ready: Promise<void>;
}>;

const WAVEFORM_COLOR = '#6d28d9';
const TRACK_BACKGROUND_COLOR = '#171717';
const WAVEFORM_ENVELOPE_SIZE = 32 * 1024;
const waveformCache = new WeakMap<InputAudioTrack, WaveformCacheEntry>();

export function getTimelineTileLayout(
	timelineWidth: number,
	timelineHeight: number,
	mediaAspectRatio: number
): TimelineTileLayout {
	const validAspectRatio =
		Number.isFinite(mediaAspectRatio) && mediaAspectRatio > 0 ? mediaAspectRatio : 16 / 9;
	const tileWidth = Math.max(1, timelineHeight * validAspectRatio);
	return {
		width: tileWidth,
		count: Math.max(1, Math.ceil(timelineWidth / tileWidth))
	};
}

function prepareCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
	const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
	canvas.width = Math.max(1, Math.floor(width * pixelRatio));
	canvas.height = Math.max(1, Math.floor(height * pixelRatio));
	const context = canvas.getContext('2d');
	if (!context) return null;
	context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
	context.imageSmoothingEnabled = true;
	context.imageSmoothingQuality = 'high';
	return context;
}

function drawLoadingTrack(
	context: CanvasRenderingContext2D,
	width: number,
	height: number,
	layout: TimelineTileLayout
) {
	context.fillStyle = TRACK_BACKGROUND_COLOR;
	context.fillRect(0, 0, width, height);
	for (let index = 0; index < layout.count; index += 1) {
		context.fillStyle = index % 2 === 0 ? '#221a2e' : '#17121f';
		context.fillRect(index * layout.width, 0, layout.width - 1, height);
	}
}

function addChannelPeaks(
	peaks: Float32Array,
	channel: Float32Array,
	bufferTimestamp: number,
	sampleRate: number,
	startTime: number,
	duration: number
) {
	const pixelsPerSecond = peaks.length / duration;
	const firstSamplePosition = (bufferTimestamp - startTime) * pixelsPerSecond;
	const pixelsPerSample = pixelsPerSecond / sampleRate;

	for (let sampleIndex = 0; sampleIndex < channel.length; sampleIndex += 1) {
		const pixelIndex = Math.round(firstSamplePosition + sampleIndex * pixelsPerSample);
		if (pixelIndex < 0 || pixelIndex >= peaks.length) continue;

		const magnitude = Math.abs(channel[sampleIndex] ?? 0);
		if (magnitude > peaks[pixelIndex]) peaks[pixelIndex] = magnitude;
	}
}

function reduceChannelPeaks(source: Float32Array, target: Float32Array) {
	target.fill(0);
	const targetScale = target.length / source.length;

	for (let sourceIndex = 0; sourceIndex < source.length; sourceIndex += 1) {
		const targetIndex = Math.round(sourceIndex * targetScale);
		if (targetIndex >= target.length) continue;

		const magnitude = source[sourceIndex] ?? 0;
		if (magnitude > target[targetIndex]) target[targetIndex] = magnitude;
	}
}

async function populateWaveformEnvelope(
	audioTrack: InputAudioTrack,
	startTime: number,
	endTime: number,
	envelope: WaveformEnvelope,
	abortController: AbortController,
	listeners: Set<() => void>
) {
	const sink = new AudioBufferSink(audioTrack);
	const duration = endTime - startTime;

	for await (const { buffer, timestamp } of sink.buffers(startTime, endTime, {
		skipLiveWait: true
	})) {
		if (abortController.signal.aborted) return;

		addChannelPeaks(
			envelope.top,
			buffer.getChannelData(0),
			timestamp,
			buffer.sampleRate,
			startTime,
			duration
		);
		if (buffer.numberOfChannels > 1) {
			envelope.bottom ??= new Float32Array(WAVEFORM_ENVELOPE_SIZE);
			addChannelPeaks(
				envelope.bottom,
				buffer.getChannelData(1),
				timestamp,
				buffer.sampleRate,
				startTime,
				duration
			);
		}

		for (const listener of listeners) listener();
	}
}

function getWaveformCacheEntry(audioTrack: InputAudioTrack, startTime: number, endTime: number) {
	const cached = waveformCache.get(audioTrack);
	if (cached) return cached;

	const envelope: WaveformEnvelope = {
		top: new Float32Array(WAVEFORM_ENVELOPE_SIZE),
		bottom: null
	};
	const abortController = new AbortController();
	const listeners = new Set<() => void>();
	const ready = populateWaveformEnvelope(
		audioTrack,
		startTime,
		endTime,
		envelope,
		abortController,
		listeners
	);
	const entry = { envelope, abortController, listeners, ready } satisfies WaveformCacheEntry;
	waveformCache.set(audioTrack, entry);
	void ready.catch(() => {
		if (waveformCache.get(audioTrack) === entry) waveformCache.delete(audioTrack);
	});
	return entry;
}

function waitForWaveformCache(entry: WaveformCacheEntry, signal: AbortSignal) {
	if (signal.aborted || entry.abortController.signal.aborted) return Promise.resolve();

	return new Promise<void>((resolve, reject) => {
		const cleanup = () => {
			signal.removeEventListener('abort', handleAbort);
			entry.abortController.signal.removeEventListener('abort', handleAbort);
		};
		const handleAbort = () => {
			cleanup();
			resolve();
		};

		signal.addEventListener('abort', handleAbort, { once: true });
		entry.abortController.signal.addEventListener('abort', handleAbort, { once: true });
		entry.ready.then(
			() => {
				cleanup();
				resolve();
			},
			(error: unknown) => {
				cleanup();
				reject(error);
			}
		);
	});
}

export function clearTimelineWaveformCache(audioTrack: InputAudioTrack | null) {
	if (!audioTrack) return;

	const entry = waveformCache.get(audioTrack);
	if (!entry) return;
	entry.abortController.abort();
	entry.listeners.clear();
	waveformCache.delete(audioTrack);
}

function drawWaveform(
	context: CanvasRenderingContext2D,
	width: number,
	height: number,
	pixelRatio: number,
	peaks: WaveformPeaks
) {
	context.fillStyle = TRACK_BACKGROUND_COLOR;
	context.fillRect(0, 0, width, height);
	context.fillStyle = WAVEFORM_COLOR;
	context.beginPath();

	const halfHeight = height / 2;
	const deviceHalfHeight = (height * pixelRatio) / 2;
	for (const [channel, direction] of [
		[peaks.top, -1],
		[peaks.bottom, 1]
	] as const) {
		context.moveTo(0, halfHeight);
		for (let pixelIndex = 0; pixelIndex < channel.length; pixelIndex += 1) {
			const deviceHeight = Math.round(channel[pixelIndex] * deviceHalfHeight) || 1;
			context.lineTo(pixelIndex / pixelRatio, halfHeight + (direction * deviceHeight) / pixelRatio);
		}
		context.lineTo(width, halfHeight);
	}

	context.fill();
	context.closePath();
}

async function drawVideoTrack({
	player,
	context,
	height,
	signal,
	layout
}: Omit<TimelinePreviewOptions, 'canvas'> & {
	context: CanvasRenderingContext2D;
	layout: TimelineTileLayout;
}) {
	const videoTrack = player.videoTrack;
	if (!videoTrack || player.duration <= 0) return false;

	const timestamps = Array.from(
		{ length: layout.count },
		(_, index) => player.startTime + ((index + 0.5) / layout.count) * player.duration
	);
	const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
	const sink = new CanvasSink(videoTrack, {
		width: Math.max(1, Math.ceil(layout.width * pixelRatio)),
		height: Math.max(1, Math.ceil(height * pixelRatio)),
		fit: 'cover',
		poolSize: 2
	});

	let index = 0;
	for await (const frame of sink.canvasesAtTimestamps(timestamps)) {
		if (signal.aborted) return true;
		if (frame) {
			context.drawImage(frame.canvas, index * layout.width, 0, layout.width + 1, height);
		}
		index += 1;
	}
	return true;
}

async function drawAudioTrack({
	player,
	context,
	width,
	height,
	signal
}: Omit<TimelinePreviewOptions, 'canvas'> & { context: CanvasRenderingContext2D }) {
	const audioTrack = player.audioTrack;
	if (!audioTrack || !Number.isFinite(player.duration) || player.duration <= 0) return false;

	const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
	const peakCount = Math.max(1, Math.floor(width * pixelRatio));
	const top = new Float32Array(peakCount);
	let bottom: Float32Array | null = null;
	let animationFrameId: number | null = null;
	const cacheEntry = getWaveformCacheEntry(audioTrack, player.startTime, player.endTime);

	const render = () => {
		animationFrameId = null;
		if (signal.aborted) return;
		reduceChannelPeaks(cacheEntry.envelope.top, top);
		if (cacheEntry.envelope.bottom) {
			bottom ??= new Float32Array(peakCount);
			reduceChannelPeaks(cacheEntry.envelope.bottom, bottom);
		}
		drawWaveform(context, width, height, pixelRatio, { top, bottom: bottom ?? top });
	};
	const scheduleRender = () => {
		if (animationFrameId === null) animationFrameId = requestAnimationFrame(render);
	};

	cacheEntry.listeners.add(scheduleRender);
	render();
	try {
		await waitForWaveformCache(cacheEntry, signal);
	} finally {
		cacheEntry.listeners.delete(scheduleRender);
		if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
	}

	if (!signal.aborted) render();
	return true;
}

export async function renderTimelinePreview(options: TimelinePreviewOptions) {
	const context = prepareCanvas(options.canvas, options.width, options.height);
	if (!context) throw new Error('This browser does not support 2D canvas rendering.');

	const videoSize = options.player.videoSize;
	const mediaAspectRatio = videoSize ? videoSize.width / videoSize.height : 16 / 9;
	const layout = getTimelineTileLayout(options.width, options.height, mediaAspectRatio);
	drawLoadingTrack(context, options.width, options.height, layout);
	if (await drawVideoTrack({ ...options, context, layout })) return;
	if (await drawAudioTrack({ ...options, context })) return;

	context.fillStyle = TRACK_BACKGROUND_COLOR;
	context.fillRect(0, 0, options.width, options.height);
}
