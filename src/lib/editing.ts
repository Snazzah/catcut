import type { ConversionOptions } from 'mediabunny';

export type CatcutConversionOptions = ConversionOptions;

export type TimelineRange = Readonly<{
	start: number;
	end: number;
}>;

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

export function stepTimelineTime(bounds: TimelineRange, time: number, direction: -1 | 1): number {
	return Math.max(bounds.start, Math.min(time + direction, bounds.end));
}

// TODO whenever more options to edit things are added, this will convert the main conversion options from our catcut options
export function optionsIntoConversionOptions(options: CatcutConversionOptions): ConversionOptions {
	return options;
}
