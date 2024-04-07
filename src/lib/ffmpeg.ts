import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { writable } from "svelte/store";

export const CORE_VERSION = "0.12.6";

const CORE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm/ffmpeg-core.js`;
const CORE_MT_URL = `https://unpkg.com/@ffmpeg/core-mt@${CORE_VERSION}/dist/esm/ffmpeg-core.js`;

const CORE_SIZE: Record<string, number> = {
  [`https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm/ffmpeg-core.js`]: 114673,
  [`https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm/ffmpeg-core.wasm`]: 32129114,
  [`https://unpkg.com/@ffmpeg/core-mt@${CORE_VERSION}/dist/esm/ffmpeg-core.js`]: 132680,
  [`https://unpkg.com/@ffmpeg/core-mt@${CORE_VERSION}/dist/esm/ffmpeg-core.wasm`]: 32609891,
  [`https://unpkg.com/@ffmpeg/core-mt@${CORE_VERSION}/dist/esm/ffmpeg-core.worker.js`]: 2915,
};

export const totalBytes = writable(1);
export const downloadedBytes = writable(0);

export const ffmpegReady = writable(false);

export const ffmpeg = new FFmpeg();
ffmpeg.on('log', ({ message: msg }: {
	type: string;
	message: string;
}) => {
	console.log(msg);
});

export async function loadFFmpeg(mt = false) {
	ffmpegReady.set(false);
	totalBytes.set(Object.keys(CORE_SIZE).filter((url) => url.includes(mt ? '@ffmpeg/core-mt@' : '@ffmpeg/core@')).reduce((p, k) => p + CORE_SIZE[k], 0));
	downloadedBytes.set(0);
	let previousBytes = 0;

	function setProgress({ url, received, done }: { url: string | URL, received: number; done: boolean }) {
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
		true, setProgress
	);
	const wasmURL = await toBlobURL(
		mt
			? CORE_MT_URL.replace(/.js$/g, '.wasm')
			: CORE_URL.replace(/.js$/g, '.wasm'),
		"application/wasm",
		true, setProgress
	);
	const workerURL = mt
		? await toBlobURL(
				CORE_MT_URL.replace(/.js$/g, '.worker.js'),
				'text/javascript',
				true, setProgress
			)
		: undefined;

	ffmpeg.terminate();
	console.log('Loading ffmpeg')
	await ffmpeg.load({
		coreURL,
		wasmURL,
		workerURL
	});
	console.log('Loaded')
	ffmpegReady.set(true);
}
