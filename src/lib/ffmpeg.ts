import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { writable } from 'svelte/store';

export const CORE_VERSION = '0.12.6';

const CDN_BASE_URL = 'https://unpkg.com';
const CORE_URL = `${CDN_BASE_URL}/@ffmpeg/core@${CORE_VERSION}/dist/esm/ffmpeg-core.js`;
const CORE_MT_URL = `${CDN_BASE_URL}/@ffmpeg/core-mt@${CORE_VERSION}/dist/esm/ffmpeg-core.js`;

const CORE_SIZE: Record<string, number> = {
	[`${CDN_BASE_URL}/@ffmpeg/core@${CORE_VERSION}/dist/esm/ffmpeg-core.js`]: 114673,
	[`${CDN_BASE_URL}/@ffmpeg/core@${CORE_VERSION}/dist/esm/ffmpeg-core.wasm`]: 32129114,
	[`${CDN_BASE_URL}/@ffmpeg/core-mt@${CORE_VERSION}/dist/esm/ffmpeg-core.js`]: 132680,
	[`${CDN_BASE_URL}/@ffmpeg/core-mt@${CORE_VERSION}/dist/esm/ffmpeg-core.wasm`]: 32609891,
	[`${CDN_BASE_URL}/@ffmpeg/core-mt@${CORE_VERSION}/dist/esm/ffmpeg-core.worker.js`]: 2915
};

export const totalBytes = writable(1);
export const downloadedBytes = writable(0);

export const ffmpegReady = writable(false);
export const ffmpegAborted = writable(false);

export const ffmpeg = new FFmpeg();
(window as any).ffmpeg = ffmpeg;
(window as any).fetchFile = fetchFile;

export async function runFFmpeg(args: string[]) {
	console.log(`Running command: ffmpeg ${args.join(' ')}`);
	ffmpegAborted.set(false);
	await ffmpeg.exec(args);
}

// Probes the input file for the codec name of its primary video and audio
// streams (e.g. `h264`, `aac`). Runs ffmpeg with no output — it errors out
// after parsing the input header, but emits the "Stream #..." log lines we
// scrape. Used by smart-cut to gate the H.264-specific bitstream path.
export async function probeStreams(
	inputFile: string
): Promise<{ video: string | null; audio: string | null }> {
	let video: string | null = null;
	let audio: string | null = null;
	const handler = ({ message }: { message: string }) => {
		const m = message.match(/Stream #\d+:\d+.*?: (Video|Audio): (\w+)/);
		if (!m) return;
		if (m[1] === 'Video' && !video) video = m[2];
		else if (m[1] === 'Audio' && !audio) audio = m[2];
	};
	ffmpeg.on('log', handler);
	try {
		console.log(`Probing streams in ${inputFile}`);
		// No output specified → ffmpeg errors after reading the header. Logs still fire.
		await ffmpeg.exec(['-i', inputFile]).catch(() => {});
	} finally {
		ffmpeg.off('log', handler);
	}
	return { video, audio };
}

// Probes the input file for video keyframe timestamps (in seconds, absolute) by
// running ffmpeg with `-skip_frame nokey` and the `showinfo` filter, then
// scraping pts_time values out of the log. Used by smart-cut.
export async function getKeyframes(inputFile: string): Promise<number[]> {
	const keyframes: number[] = [];
	const handler = ({ message }: { message: string }) => {
		if (!message.includes('Parsed_showinfo')) return;
		const m = message.match(/pts_time:\s*([\d.]+)/);
		if (m) keyframes.push(parseFloat(m[1]));
	};
	ffmpeg.on('log', handler);
	try {
		console.log(`Probing keyframes in ${inputFile}`);
		ffmpegAborted.set(false);
		await ffmpeg.exec([
			'-skip_frame',
			'nokey',
			'-i',
			inputFile,
			'-an',
			'-sn',
			'-vf',
			'showinfo',
			'-vsync',
			'passthrough',
			'-f',
			'null',
			'-'
		]);
	} finally {
		ffmpeg.off('log', handler);
	}
	return keyframes.sort((a, b) => a - b);
}

ffmpeg.on('log', ({ message }) => {
	console.log(message);
	if (message === 'Aborted()') ffmpegAborted.set(true);
});

export const ffmpegProgress = writable(0);
ffmpeg.on('progress', ({ progress }) => ffmpegProgress.set(progress > 1 ? 0 : progress));

export async function loadFFmpeg(mt = false) {
	ffmpegReady.set(false);
	totalBytes.set(
		Object.keys(CORE_SIZE)
			.filter((url) => url.includes(mt ? '@ffmpeg/core-mt@' : '@ffmpeg/core@'))
			.reduce((p, k) => p + CORE_SIZE[k], 0)
	);
	downloadedBytes.set(0);
	let previousBytes = 0;

	function setProgress({
		url,
		received,
		done
	}: {
		url: string | URL;
		received: number;
		done: boolean;
	}) {
		const size = CORE_SIZE[url.toString()];
		if (done) {
			console.info(`Downloaded asset: ${url}`);
			previousBytes += size;
			downloadedBytes.set(previousBytes);
		} else downloadedBytes.set(previousBytes + received);
	}

	const coreURL = await toBlobURL(
		mt ? CORE_MT_URL : CORE_URL,
		'text/javascript',
		true,
		setProgress
	);
	const wasmURL = await toBlobURL(
		mt ? CORE_MT_URL.replace(/.js$/g, '.wasm') : CORE_URL.replace(/.js$/g, '.wasm'),
		'application/wasm',
		true,
		setProgress
	);
	const workerURL = mt
		? await toBlobURL(
				CORE_MT_URL.replace(/.js$/g, '.worker.js'),
				'text/javascript',
				true,
				setProgress
			)
		: undefined;

	ffmpeg.terminate();
	console.log('Loading ffmpeg');
	await ffmpeg.load({
		coreURL,
		wasmURL,
		workerURL
	});
	console.log('Loaded');
	ffmpegReady.set(true);
}
