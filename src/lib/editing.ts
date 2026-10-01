import {
	AudioSample,
	Quality,
	type ConversionOptions,
	type ConversionVideoOptions,
	type CropRectangle,
	type QualityLevel,
	type QualityOptions,
	type VideoSample
} from 'mediabunny';

export type VideoSize = Readonly<{
	width: number;
	height: number;
}>;

export type TimelineRange = Readonly<{
	start: number;
	end: number;
}>;

export type AnyQuality = QualityLevel | 'terrible';

const CUSTOM_QUALITIES = {
	terrible: { quantizer: 51, bitrate: 1e4, bitrateMode: 'constant' }
} satisfies Record<Exclude<AnyQuality, QualityLevel>, QualityOptions>;

export type AudioAdjustment = Readonly<{ volume: number }>;

export type ResizeFit = NonNullable<ConversionVideoOptions['fit']>;
export type ResizeAdjustment = Readonly<{ width: number; height: number; fit: ResizeFit }>;

export type EditState = Readonly<{
	trim: TimelineRange;
	crop: CropRectangle | null;
	resize: ResizeAdjustment;
	videoQuality: AnyQuality | null;
	audioQuality: AnyQuality | null;
	audioAdjustment: AudioAdjustment;
}>;

export type SampleProcess<Sample extends { close: () => void }> = (
	sample: Sample
) => Sample | Sample[] | null | Promise<Sample | Sample[] | null>;

export type AudioProcess = SampleProcess<AudioSample>;
export type VideoProcess = SampleProcess<VideoSample>;

export const QUALITY_PRESETS = [
	{ value: 'terrible', label: 'Terrible' },
	{ value: 'very-low', label: 'Very Low' },
	{ value: 'low', label: 'Low' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'high', label: 'High' },
	{ value: 'very-high', label: 'Very High' }
] satisfies readonly Readonly<{ value: AnyQuality; label: string }>[];

function createQuality(quality: AnyQuality): Quality {
	return new Quality(CUSTOM_QUALITIES[quality as keyof typeof CUSTOM_QUALITIES] ?? quality);
}

export function createTrimRange(
	bounds: TimelineRange,
	start = bounds.start,
	end = bounds.end
): TimelineRange {
	const clampedStart = Math.max(bounds.start, Math.min(start, bounds.end));
	const clampedEnd = Math.max(clampedStart, Math.min(end, bounds.end));
	return { start: clampedStart, end: clampedEnd };
}

export function expandTrimRangeToTime(
	bounds: TimelineRange,
	trim: TimelineRange,
	time: number
): TimelineRange {
	if (time < trim.start) return createTrimRange(bounds, time, trim.end);
	if (time > trim.end) return createTrimRange(bounds, trim.start, time);
	return trim;
}

export function isFullTrimRange(bounds: TimelineRange, trim: TimelineRange): boolean {
	return trim.start === bounds.start && trim.end === bounds.end;
}

export function stepTimelineTime(bounds: TimelineRange, time: number, direction: -1 | 1): number {
	return Math.max(bounds.start, Math.min(time + direction, bounds.end));
}

export function createCropRectangle(
	bounds: VideoSize,
	crop: Partial<CropRectangle> = {}
): CropRectangle {
	const width = Math.max(1, Math.min(Math.round(crop.width ?? bounds.width), bounds.width));
	const height = Math.max(1, Math.min(Math.round(crop.height ?? bounds.height), bounds.height));
	const left = Math.max(0, Math.min(Math.round(crop.left ?? 0), bounds.width - width));
	const top = Math.max(0, Math.min(Math.round(crop.top ?? 0), bounds.height - height));
	return { left, top, width, height };
}

export function isFullFrameCrop(bounds: VideoSize, crop: CropRectangle): boolean {
	return (
		crop.left === 0 &&
		crop.top === 0 &&
		crop.width === bounds.width &&
		crop.height === bounds.height
	);
}

export function createEditState({
	bounds,
	videoSize
}: {
	bounds: TimelineRange;
	videoSize: VideoSize | null;
}): EditState {
	return {
		trim: createTrimRange(bounds),
		crop: videoSize ? createCropRectangle(videoSize) : null,
		resize: { width: 0, height: 0, fit: 'fill' },
		videoQuality: null,
		audioQuality: null,
		audioAdjustment: { volume: 1 }
	};
}

function transformAudioSample(sample: AudioSample, gain: number): AudioSample {
	const planeLength = sample.numberOfFrames;
	const data = new Float32Array(planeLength * sample.numberOfChannels);

	for (let channel = 0; channel < sample.numberOfChannels; channel++) {
		const plane = data.subarray(channel * planeLength, (channel + 1) * planeLength);
		sample.copyTo(plane, { planeIndex: channel, format: 'f32-planar' });
		for (let index = 0; index < plane.length; index++) {
			plane[index] = Math.max(-1, Math.min(1, plane[index] * gain));
		}
	}

	return new AudioSample({
		format: 'f32-planar',
		sampleRate: sample.sampleRate,
		numberOfChannels: sample.numberOfChannels,
		timestamp: sample.timestamp,
		data
	});
}

export function composeSampleProcesses<Sample extends { close: () => void }>(
	processes: readonly SampleProcess<Sample>[]
): SampleProcess<Sample> | undefined {
	if (processes.length === 0) return undefined;

	return async (sample) => {
		let samples: Sample[] = [sample];
		for (const process of processes) {
			const nextSamples: Sample[] = [];
			for (const current of samples) {
				let processed: Sample | Sample[] | null;
				try {
					processed = await process(current);
				} catch (error) {
					current.close();
					throw error;
				}
				const processedSamples = processed
					? Array.isArray(processed)
						? processed
						: [processed]
					: [];
				nextSamples.push(...processedSamples);
				if (!processedSamples.includes(current)) current.close();
			}
			samples = nextSamples;
			if (samples.length === 0) return null;
		}
		return samples.length === 1 ? samples[0] : samples;
	};
}

export function editStateIntoConversionOptions({
	state,
	bounds,
	videoSize,
	input,
	output
}: {
	state: EditState;
	bounds: TimelineRange;
	videoSize: VideoSize | null;
	input: ConversionOptions['input'];
	output: ConversionOptions['output'];
}): ConversionOptions {
	const crop =
		videoSize && state.crop && !isFullFrameCrop(videoSize, state.crop) ? state.crop : undefined;
	const videoQuality = state.videoQuality ? createQuality(state.videoQuality) : undefined;
	const resize =
		videoSize && (state.resize.width > 0 || state.resize.height > 0) ? state.resize : null;
	const audioQuality = state.audioQuality ? createQuality(state.audioQuality) : undefined;
	const discardAudio = state.audioAdjustment.volume === 0;
	const videoProcesses: VideoProcess[] = [];
	const audioProcesses: AudioProcess[] = [];
	if (state.audioAdjustment.volume !== 0 && state.audioAdjustment.volume !== 1) {
		const volume = state.audioAdjustment.volume;
		audioProcesses.push((sample) => transformAudioSample(sample, volume));
	}
	const videoProcess = composeSampleProcesses(videoProcesses);
	const audioProcess = composeSampleProcesses(audioProcesses);

	return {
		input,
		output,
		...(!isFullTrimRange(bounds, state.trim) && { trim: state.trim }),
		...((crop || resize || videoQuality || videoProcess) && {
			video: {
				...(crop && { crop }),
				...(resize && {
					...(resize.width > 0 && { width: resize.width }),
					...(resize.height > 0 && { height: resize.height }),
					...(resize.width > 0 && resize.height > 0 && { fit: resize.fit })
				}),
				...(videoQuality && { quality: videoQuality }),
				...(videoProcess && { process: videoProcess })
			}
		}),
		...((discardAudio || audioQuality || audioProcess) && {
			audio: {
				...(discardAudio && { discard: true }),
				...(audioQuality && { quality: audioQuality }),
				...(audioProcess && { process: audioProcess })
			}
		})
	};
}
