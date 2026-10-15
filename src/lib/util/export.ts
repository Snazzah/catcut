import {
	AudioSampleSink,
	AudioSampleSource,
	BufferTarget,
	Conversion,
	ConversionCanceledError,
	NON_PCM_AUDIO_CODECS,
	Quality,
	StreamTarget,
	type StreamTargetChunk,
	getEncodableAudioCodecs,
	type AudioCodec,
	type AudioEncodingConfig,
	type AudioSample,
	type ConversionAudioOptions,
	type ConversionOptions,
	type ConversionVideoOptions,
	type InputAudioTrack,
	ADTS,
	FLAC,
	MATROSKA,
	MP3,
	MP4,
	MPEG_TS,
	OGG,
	QTFF,
	WAVE,
	WEBM,
	AdtsOutputFormat,
	FlacOutputFormat,
	MkvOutputFormat,
	MovOutputFormat,
	Mp3OutputFormat,
	Mp4OutputFormat,
	MpegTsOutputFormat,
	OggOutputFormat,
	WavOutputFormat,
	WebMOutputFormat,
	type InputFormat,
	type OutputFormat
} from 'mediabunny';
import { StretchAudio } from '../audio/stretch-audio';
import type { SpeedAdjustment, TimelineRange } from './editing';
import { isDiscordActivity } from '#lib/discord/index.svelte.js';

type ExportDestination = { dispose: () => Promise<void> } & (
	| { kind: 'saved'; target: StreamTarget }
	| { kind: 'download'; target: StreamTarget | BufferTarget; getFile: () => Promise<File> }
);

export async function createExportDestination({
	format,
	suggestedName,
	extension
}: {
	format: OutputFormat;
	suggestedName: string;
	extension: `.${string}`;
}): Promise<ExportDestination> {
	let temporaryFile: {
		directory: FileSystemDirectoryHandle;
		name: string;
		file: FileSystemFileHandle;
	} | null = null;
	let writable: FileSystemWritableFileStream;
	if (window.showSaveFilePicker && !isDiscordActivity()) {
		const handle = await window.showSaveFilePicker({
			startIn: 'downloads',
			suggestedName,
			id: 'catcut',
			types: [{ description: 'Media file', accept: { [format.mimeType]: [extension] } }]
		});
		writable = await handle.createWritable();
	} else {
		try {
			const root = await navigator.storage.getDirectory();
			const directory = await root.getDirectoryHandle('catcut-exports', { create: true });
			const name = crypto.randomUUID();
			const file = await directory.getFileHandle(name, { create: true });
			temporaryFile = { directory, name, file };
			writable = await file.createWritable();
		} catch {
			if (temporaryFile)
				await temporaryFile.directory.removeEntry(temporaryFile.name).catch(() => {});
			// Incognito prevents storage API things
			const target = new BufferTarget();
			return {
				kind: 'download',
				target,
				async getFile() {
					if (!target.buffer) throw new Error('The conversion did not produce a file.');
					return new File([target.buffer], suggestedName, { type: format.mimeType });
				},
				dispose: async () => {}
			};
		}
	}

	const writer = writable.getWriter();
	let closing: Promise<void> | null = null;
	const close = () => (closing ??= writer.close());
	let disposing: Promise<void> | null = null;
	const dispose = () =>
		(disposing ??= (async () => {
			try {
				await writer.abort();
			} finally {
				if (temporaryFile) await temporaryFile.directory.removeEntry(temporaryFile.name);
			}
		})());
	const stream = new WritableStream<StreamTargetChunk>({
		write: (chunk) => writer.write(chunk),
		close,
		abort: () => writer.abort()
	});
	const target = new StreamTarget(stream, { chunked: true, chunkSize: 1024 * 1024 });
	if (!temporaryFile) return { kind: 'saved', target, dispose };
	const file = temporaryFile.file;
	return {
		kind: 'download',
		target,
		async getFile() {
			await close();
			return new File([await file.getFile()], suggestedName, { type: format.mimeType });
		},
		dispose
	};
}

export const exportFormats = [
	{ id: 'mp4', label: 'MP4', format: Mp4OutputFormat },
	{ id: 'mov', label: 'MOV', format: MovOutputFormat },
	{ id: 'webm', label: 'WebM', format: WebMOutputFormat },
	{ id: 'mkv', label: 'MKV', format: MkvOutputFormat },
	{ id: 'mp3', label: 'MP3', format: Mp3OutputFormat },
	{ id: 'wav', label: 'WAV', format: WavOutputFormat },
	{ id: 'ogg', label: 'OGG', format: OggOutputFormat },
	{ id: 'flac', label: 'FLAC', format: FlacOutputFormat },
	{ id: 'aac', label: 'AAC', format: AdtsOutputFormat },
	{ id: 'ts', label: 'MPEG-TS', format: MpegTsOutputFormat }
] as const;

export type ExportFormatId = (typeof exportFormats)[number]['id'];

export function getMatchingOutputFormat(inputFormat: InputFormat): OutputFormat | null {
	switch (inputFormat) {
		case MP4:
			return new Mp4OutputFormat();
		case QTFF:
			return new MovOutputFormat();
		case WEBM:
			return new WebMOutputFormat();
		case MATROSKA:
			return new MkvOutputFormat();
		case MP3:
			return new Mp3OutputFormat();
		case WAVE:
			return new WavOutputFormat();
		case OGG:
			return new OggOutputFormat();
		case FLAC:
			return new FlacOutputFormat();
		case ADTS:
			return new AdtsOutputFormat();
		case MPEG_TS:
			return new MpegTsOutputFormat();
		default:
			return null;
	}
}

export function getExportExtension(format: OutputFormat, filename: string): `.${string}` {
	const extension = filename.match(/\.[^.]+$/)?.[0].toLowerCase();
	if (format instanceof Mp4OutputFormat && (extension === '.m4a' || extension === '.m4v')) {
		return extension;
	}
	if (format instanceof OggOutputFormat && (extension === '.oga' || extension === '.ogv')) {
		return extension;
	}
	if (format instanceof MpegTsOutputFormat && (extension === '.mts' || extension === '.m2ts')) {
		return extension;
	}
	return format.fileExtension as `.${string}`;
}

type ExportOptions = Pick<ConversionOptions, 'input' | 'output' | 'tags' | 'copy'> & {
	trim: TimelineRange;
	adjustment: SpeedAdjustment;
	video?: ConversionVideoOptions;
	audio?: ConversionAudioOptions;
	onProgress?: (progress: number) => void;
};

const compressedAudioCodecs: ReadonlySet<AudioCodec> = new Set(NON_PCM_AUDIO_CODECS);

export class ExportTask {
	#conversion: Conversion | null = null;
	#stretch: StretchAudio | null = null;
	#canceled = false;
	#complete = false;
	#execution: Promise<void> | null = null;
	#cancellation: Promise<void> | null = null;
	#progress = 0;

	constructor(private readonly options: ExportOptions) {}

	execute(): Promise<void> {
		return (this.#execution ??= this.#execute());
	}

	cancel(): Promise<void> {
		if (this.#complete) return Promise.resolve();
		this.#canceled = true;
		this.#stretch?.dispose();
		this.options.input.dispose();
		return (this.#cancellation ??= Promise.allSettled([
			this.#conversion?.cancel(),
			this.options.output.cancel()
		]).then(() => undefined));
	}

	#checkCanceled() {
		if (this.#canceled) throw new ConversionCanceledError();
	}

	#reportProgress(processedTime: number) {
		const { trim, adjustment } = this.options;
		const duration = (trim.end - trim.start) / adjustment.speed;
		const progress = Math.max(
			this.#progress,
			Math.min(1 - Number.EPSILON, processedTime / duration)
		);
		if (progress > this.#progress && !this.#canceled) {
			this.#progress = progress;
			this.options.onProgress?.(progress);
		}
	}

	async #execute() {
		const { input, output, trim, adjustment, tags, copy } = this.options;
		try {
			this.#checkCanceled();
			const [videoTrack, audioTrack] = await Promise.all([
				input.getPrimaryVideoTrack(),
				input.getPrimaryAudioTrack()
			]);
			this.#checkCanceled();

			const discardVideo =
				this.options.video?.discard || output.format.getSupportedVideoCodecs().length === 0;
			const video: ConversionVideoOptions = discardVideo
				? { discard: true }
				: { ...this.options.video };
			if (videoTrack && !discardVideo && adjustment.speed !== 1) {
				if (video.frameRate !== undefined) video.frameRate /= adjustment.speed;
				const process = video.process;
				const duration = (trim.end - trim.start) / adjustment.speed;
				video.process = (sample) => {
					sample.setTimestamp(sample.timestamp / adjustment.speed);
					if (sample.timestamp >= duration) return null;
					sample.setDuration(
						Math.min(sample.duration / adjustment.speed, duration - sample.timestamp)
					);
					return process ? process(sample) : sample;
				};
			}

			const manualAudio =
				audioTrack &&
				!this.options.audio?.discard &&
				(adjustment.speed !== 1 || adjustment.pitchSemitones !== 0);
			if (!manualAudio) {
				const conversion = await this.#initConversion({
					input,
					output,
					trim,
					video,
					audio: this.options.audio,
					tags,
					copy
				});
				conversion.onProgress = (_, processedTime) =>
					this.#reportProgress(processedTime / adjustment.speed);
				await conversion.execute();
			} else {
				if (copy && copy.mode === 'forced') {
					throw new Error('Speed and pitch editing requires audio transcoding.');
				}
				const conversion =
					videoTrack && !discardVideo
						? await this.#initConversion({
								input,
								output,
								trim,
								video,
								audio: { discard: true },
								copy,
								composable: true
							})
						: null;
				await this.#executeComposed(audioTrack, conversion);
			}
			this.#checkCanceled();
			this.#complete = true;
			this.options.onProgress?.(1);
		} catch (error) {
			await this.cancel();
			throw error;
		} finally {
			this.#stretch?.dispose();
			input.dispose();
		}
	}

	async #initConversion(options: ConversionOptions) {
		const conversion = await Conversion.init({
			...options,
			tracks: 'primary',
			showWarnings: false
		});
		this.#conversion = conversion;
		if (this.options.video?.frameRate !== undefined) {
			for (const track of this.options.output.tracks) {
				if (track.isVideoTrack()) track.metadata.frameRate = this.options.video.frameRate;
			}
		}
		if (this.#canceled) {
			await conversion.cancel();
			this.#checkCanceled();
		}
		if (
			!conversion.isValid ||
			conversion.utilizedTracks.length === 0 ||
			conversion.discardedTracks.some(({ reason }) => reason !== 'discarded_by_user')
		) {
			throw new Error('This media could not be converted without losing a track.');
		}
		return conversion;
	}

	async #resolveAudio(track: InputAudioTrack) {
		if (!(await track.canDecode())) throw new Error('This audio track cannot be decoded.');
		const sourceSampleRate = await track.getSampleRate();
		const sourceNumberOfChannels = await track.getNumberOfChannels();
		const sourceCodec = await track.getCodec();
		const sourceBitrate = await track.getBitrate();
		const options = this.options.audio ?? {};
		let sampleRate = options.sampleRate ?? sourceSampleRate;
		let numberOfChannels = options.numberOfChannels ?? sourceNumberOfChannels;
		const bitrate = options.bitrate ?? sourceBitrate;
		const quality =
			options.quality ??
			(bitrate instanceof Quality ? bitrate : new Quality(bitrate ? { bitrate } : 'high'));
		const codecs = this.options.output.format
			.getSupportedAudioCodecs()
			.filter((codec) => !options.codec || codec === options.codec);
		const encodable = await getEncodableAudioCodecs(codecs, {
			sampleRate,
			numberOfChannels,
			quality
		});
		let codec: AudioCodec | undefined =
			encodable.find((codec) => codec === sourceCodec) ?? encodable[0];
		if (
			codec !== sourceCodec &&
			!encodable.some((codec) => compressedAudioCodecs.has(codec)) &&
			codecs.some((codec) => compressedAudioCodecs.has(codec)) &&
			(sampleRate !== 48000 || numberOfChannels !== 2)
		) {
			const fallback = await getEncodableAudioCodecs(codecs, {
				sampleRate: 48000,
				numberOfChannels: 2,
				quality
			});
			const fallbackCodec = fallback.find((codec) => compressedAudioCodecs.has(codec));
			if (fallbackCodec) {
				codec = fallbackCodec;
				sampleRate = 48000;
				numberOfChannels = 2;
			}
		}
		if (!codec) throw new Error('No supported audio encoder is available for this format.');

		const encoding: AudioEncodingConfig = {
			codec,
			quality,
			transform: { sampleRate, numberOfChannels, sampleFormat: options.sampleFormat }
		};
		return { sourceSampleRate, sourceNumberOfChannels, encoding };
	}

	async #executeComposed(track: InputAudioTrack, conversion: Conversion | null) {
		const { input, output, tags, trim, adjustment } = this.options;
		const { sourceSampleRate, sourceNumberOfChannels, encoding } = await this.#resolveAudio(track);
		this.#checkCanceled();
		const source = new AudioSampleSource(encoding);
		const language = await track.getLanguageCode();
		output.addAudioTrack(source, {
			languageCode: /^[a-z]{3}$/.test(language) ? language : undefined,
			name: (await track.getName()) ?? undefined,
			disposition: await track.getDisposition(),
			group: this.options.audio?.group
		});
		const inputTags = await input.getMetadataTags();
		const outputTags = {
			...(typeof tags === 'function' ? await tags(inputTags) : (tags ?? inputTags))
		};
		if (
			outputTags.raw === inputTags.raw &&
			(await input.getFormat()).mimeType !== output.format.mimeType
		) {
			delete outputTags.raw;
		}
		output.setMetadataTags(outputTags);
		this.#stretch = new StretchAudio({
			sampleRate: sourceSampleRate,
			numberOfChannels: sourceNumberOfChannels,
			adjustment,
			trim,
			audioProcess: this.options.audio?.process
		});
		this.#checkCanceled();
		await output.start();
		const iterator = this.#audioSamples(track);
		let audioClosed = false;
		let audioTime = 0;
		let videoTime = 0;
		const reportProgress = () =>
			this.#reportProgress(
				Math.min(
					audioClosed ? Infinity : audioTime,
					conversion?.state === 'done' || !conversion ? Infinity : videoTime
				)
			);
		if (conversion) {
			conversion.onProgress = (_, processedTime) => {
				videoTime = processedTime / adjustment.speed;
				reportProgress();
			};
		}
		try {
			let pending = await iterator.next();
			let offset = 0;
			// Both tracks advance lock-step
			for (let until = 1; !pending.done || (conversion && conversion.state !== 'done'); until++) {
				this.#checkCanceled();
				await Promise.all([
					conversion?.execute({ until }),
					(async () => {
						while (
							!pending.done &&
							pending.value.timestamp + offset / pending.value.sampleRate < until
						) {
							this.#checkCanceled();
							const sample = pending.value;
							const end = Math.min(
								sample.numberOfFrames,
								Math.ceil((until - sample.timestamp) * sample.sampleRate)
							);
							const slice = sample.trim(offset, end);
							try {
								await source.add(slice);
								audioTime = slice.timestamp + slice.duration;
								reportProgress();
							} finally {
								slice.close();
							}
							offset = end;
							if (offset === sample.numberOfFrames) {
								pending = await iterator.next();
								offset = 0;
							}
						}
						if (pending.done && !audioClosed) {
							audioClosed = true;
							source.close();
						}
					})()
				]);
				this.#checkCanceled();
				reportProgress();
			}
			if (!audioClosed) source.close();
			this.#checkCanceled();
			await output.finalize();
		} catch (error) {
			const canceled = this.#canceled;
			await this.cancel();
			throw canceled ? new ConversionCanceledError() : error;
		} finally {
			await iterator.return();
		}
	}

	async *#audioSamples(track: InputAudioTrack): AsyncGenerator<AudioSample, void> {
		const stretch = this.#stretch;
		if (!stretch) return;
		const { trim } = this.options;
		for await (const sample of new AudioSampleSink(track).samples(trim.start, trim.end)) {
			let output: AudioSample[];
			try {
				this.#checkCanceled();
				output = await stretch.process(sample);
			} finally {
				sample.close();
			}
			try {
				yield* output;
			} finally {
				for (const emitted of output) emitted.close();
			}
		}
		this.#checkCanceled();
		const tail = await stretch.finish();
		try {
			yield* tail;
		} finally {
			for (const emitted of tail) emitted.close();
		}
	}
}
