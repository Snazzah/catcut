import { AudioSampleSink, CanvasSink, type InputAudioTrack } from 'mediabunny';
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
	distanceToCenter: Float32Array;
};

type WaveformCacheEntry = Readonly<{
	envelope: WaveformEnvelope;
	abortController: AbortController;
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

function addSamplePeaks({
	envelope,
	topSamples,
	bottomSamples,
	frameCount,
	sampleTimestamp,
	sampleRate,
	startTime,
	duration
}: {
	envelope: WaveformEnvelope;
	topSamples: Float32Array;
	bottomSamples: Float32Array | null;
	frameCount: number;
	sampleTimestamp: number;
	sampleRate: number;
	startTime: number;
	duration: number;
}) {
	if (frameCount === 0) return;

	const binsPerSecond = envelope.top.length / duration;
	const firstSamplePosition = (sampleTimestamp - startTime) * binsPerSecond;
	const binsPerSample = binsPerSecond / sampleRate;
	const lastSamplePosition = firstSamplePosition + (frameCount - 1) * binsPerSample;
	const firstBin = Math.max(0, Math.round(firstSamplePosition));
	const lastBin = Math.min(envelope.top.length - 1, Math.round(lastSamplePosition));
	if (firstBin > lastBin) return;

	const bottomPeaks = bottomSamples
		? (envelope.bottom ??= new Float32Array(WAVEFORM_ENVELOPE_SIZE))
		: null;
	for (let binIndex = firstBin; binIndex <= lastBin; binIndex += 1) {
		const sampleIndex = Math.max(
			0,
			Math.min(frameCount - 1, Math.round((binIndex - firstSamplePosition) / binsPerSample))
		);
		const samplePosition = firstSamplePosition + sampleIndex * binsPerSample;
		if (Math.round(samplePosition) !== binIndex) continue;

		const distanceToCenter = Math.abs(samplePosition - binIndex);
		if (distanceToCenter >= (envelope.distanceToCenter[binIndex] ?? Infinity)) continue;

		envelope.top[binIndex] = Math.abs(topSamples[sampleIndex] ?? 0);
		if (bottomPeaks && bottomSamples) {
			bottomPeaks[binIndex] = Math.abs(bottomSamples[sampleIndex] ?? 0);
		}
		envelope.distanceToCenter[binIndex] = distanceToCenter;
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
	abortController: AbortController
) {
	const sink = new AudioSampleSink(audioTrack);
	const duration = endTime - startTime;
	let topSamples = new Float32Array(0);
	let bottomSamples = new Float32Array(0);

	for await (const sample of sink.samples(startTime, endTime, {
		skipLiveWait: true
	})) {
		try {
			if (abortController.signal.aborted) return;
			if (sample.numberOfFrames === 0) continue;

			if (topSamples.length < sample.numberOfFrames) {
				topSamples = new Float32Array(sample.numberOfFrames);
			}
			sample.copyTo(topSamples, { planeIndex: 0, format: 'f32-planar' });

			let secondChannel: Float32Array | null = null;
			if (sample.numberOfChannels > 1) {
				if (bottomSamples.length < sample.numberOfFrames) {
					bottomSamples = new Float32Array(sample.numberOfFrames);
				}
				sample.copyTo(bottomSamples, { planeIndex: 1, format: 'f32-planar' });
				secondChannel = bottomSamples;
			}

			addSamplePeaks({
				envelope,
				topSamples,
				bottomSamples: secondChannel,
				frameCount: sample.numberOfFrames,
				sampleTimestamp: sample.timestamp,
				sampleRate: sample.sampleRate,
				startTime,
				duration
			});
		} finally {
			sample.close();
		}
	}
}

function getWaveformCacheEntry(audioTrack: InputAudioTrack, startTime: number, endTime: number) {
	const cached = waveformCache.get(audioTrack);
	if (cached) return cached;

	const distanceToCenter = new Float32Array(WAVEFORM_ENVELOPE_SIZE);
	distanceToCenter.fill(Infinity);
	const envelope: WaveformEnvelope = {
		top: new Float32Array(WAVEFORM_ENVELOPE_SIZE),
		bottom: null,
		distanceToCenter
	};
	const abortController = new AbortController();
	const ready = populateWaveformEnvelope(audioTrack, startTime, endTime, envelope, abortController);
	const entry = { envelope, abortController, ready } satisfies WaveformCacheEntry;
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
	const cacheEntry = getWaveformCacheEntry(audioTrack, player.startTime, player.endTime);

	const render = () => {
		if (signal.aborted) return;
		reduceChannelPeaks(cacheEntry.envelope.top, top);
		if (cacheEntry.envelope.bottom) {
			bottom ??= new Float32Array(peakCount);
			reduceChannelPeaks(cacheEntry.envelope.bottom, bottom);
		}
		drawWaveform(context, width, height, pixelRatio, { top, bottom: bottom ?? top });
	};

	await waitForWaveformCache(cacheEntry, signal);

	if (!signal.aborted && !cacheEntry.abortController.signal.aborted) render();
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
