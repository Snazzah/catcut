import { AudioBufferSink, CanvasSink } from 'mediabunny';
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

const WAVEFORM_COLOR = '#6d28d9';
const TRACK_BACKGROUND_COLOR = '#171717';

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

	const sink = new AudioBufferSink(audioTrack);
	const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
	const peakCount = Math.max(1, Math.floor(width * pixelRatio));
	const top = new Float32Array(peakCount);
	let bottom: Float32Array | null = null;
	let animationFrameId: number | null = null;

	const render = () => {
		animationFrameId = null;
		if (signal.aborted) return;
		drawWaveform(context, width, height, pixelRatio, { top, bottom: bottom ?? top });
	};
	const scheduleRender = () => {
		if (animationFrameId === null) animationFrameId = requestAnimationFrame(render);
	};

	render();
	try {
		for await (const { buffer, timestamp } of sink.buffers(player.startTime, player.endTime, {
			skipLiveWait: true
		})) {
			if (signal.aborted) return true;

			addChannelPeaks(
				top,
				buffer.getChannelData(0),
				timestamp,
				buffer.sampleRate,
				player.startTime,
				player.duration
			);
			if (buffer.numberOfChannels > 1) {
				bottom ??= new Float32Array(peakCount);
				addChannelPeaks(
					bottom,
					buffer.getChannelData(1),
					timestamp,
					buffer.sampleRate,
					player.startTime,
					player.duration
				);
			}
			scheduleRender();
		}
	} finally {
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
