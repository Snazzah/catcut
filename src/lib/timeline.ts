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
	context.fillStyle = '#171717';
	context.fillRect(0, 0, width, height);
	for (let index = 0; index < layout.count; index += 1) {
		context.fillStyle = index % 2 === 0 ? '#221a2e' : '#17121f';
		context.fillRect(index * layout.width, 0, layout.width - 1, height);
	}
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
	if (!audioTrack || player.duration <= 0) return false;

	const sink = new AudioBufferSink(audioTrack);
	// TODO make a waveform like wavesurfers!
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

	context.fillStyle = '#171717';
	context.fillRect(0, 0, options.width, options.height);
}
