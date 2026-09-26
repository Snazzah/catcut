import { Quality, type ConversionOptions, type CropRectangle, type QualityLevel } from 'mediabunny';

export type VideoSize = Readonly<{
	width: number;
	height: number;
}>;

export type TimelineRange = Readonly<{
	start: number;
	end: number;
}>;

export type EditState = Readonly<{
	trim: TimelineRange;
	crop: CropRectangle | null;
	videoQuality: QualityLevel | null;
	audioQuality: QualityLevel | null;
}>;

export const QUALITY_PRESETS = [
	{ value: 'very-low', label: 'Very Low' },
	{ value: 'low', label: 'Low' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'high', label: 'High' },
	{ value: 'very-high', label: 'Very High' }
] satisfies readonly Readonly<{ value: QualityLevel; label: string }>[];

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
		videoQuality: null,
		audioQuality: null
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
	const videoQuality = state.videoQuality ? new Quality(state.videoQuality) : undefined;
	const audioQuality = state.audioQuality ? new Quality(state.audioQuality) : undefined;

	return {
		input,
		output,
		...(!isFullTrimRange(bounds, state.trim) && { trim: state.trim }),
		...((crop || videoQuality) && {
			video: { ...(crop && { crop }), ...(videoQuality && { quality: videoQuality }) }
		}),
		...(audioQuality && { audio: { quality: audioQuality } })
	};
}
