import {
	AudioSampleSink,
	AudioSampleSource,
	Conversion,
	ConversionCanceledError,
	NON_PCM_AUDIO_CODECS,
	Quality,
	getEncodableAudioCodecs,
	type AudioCodec,
	type AudioEncodingConfig,
	type AudioSample,
	type ConversionAudioOptions,
	type ConversionOptions,
	type ConversionVideoOptions,
	type InputAudioTrack
} from 'mediabunny';
import { StretchAudio } from './audio/stretch-audio';
import type { SpeedAdjustment, TimelineRange } from './editing';

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
