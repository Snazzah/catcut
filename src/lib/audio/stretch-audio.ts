import { AudioSample } from 'mediabunny';
import {
	calculateSpeedParameters,
	type AudioProcess,
	type SpeedAdjustment,
	type TimelineRange
} from '../editing';
import { TimeStretcher } from './time-stretcher';

export class StretchAudio {
	#stretcher: TimeStretcher | null;
	#inputFrames = 0;
	#outputFrames = 0;
	#finished = false;
	readonly #sampleRate: number;
	readonly #numberOfChannels: number;
	readonly #pitchedSampleRate: number;
	readonly #trim: TimelineRange;
	readonly #audioProcess: AudioProcess | undefined;

	constructor({
		sampleRate,
		numberOfChannels,
		adjustment,
		trim,
		audioProcess
	}: {
		sampleRate: number;
		numberOfChannels: number;
		adjustment: SpeedAdjustment;
		trim: TimelineRange;
		audioProcess?: AudioProcess;
	}) {
		const { pitchRatio, stretchFactor } = calculateSpeedParameters(adjustment);
		this.#sampleRate = sampleRate;
		this.#numberOfChannels = numberOfChannels;
		this.#pitchedSampleRate = sampleRate * pitchRatio;
		this.#trim = trim;
		this.#audioProcess = audioProcess;
		this.#stretcher =
			stretchFactor === 1 ? null : new TimeStretcher(numberOfChannels, sampleRate, stretchFactor);
	}

	async process(sample: AudioSample): Promise<AudioSample[]> {
		if (this.#finished) throw new Error('Cannot process audio after finishing or disposing.');

		const sampleStart = Math.round((sample.timestamp - this.#trim.start) * this.#sampleRate);
		const startFrame = Math.max(0, -sampleStart, this.#inputFrames - sampleStart);
		const endFrame = Math.min(
			sample.numberOfFrames,
			Math.round((this.#trim.end - this.#trim.start) * this.#sampleRate) - sampleStart
		);
		if (startFrame >= endFrame) return [];

		const output: AudioSample[] = [];
		try {
			// Preserve leading delays and gaps
			let gapFrames = sampleStart + startFrame - this.#inputFrames;
			while (gapFrames > 0) {
				const length = Math.min(gapFrames, this.#sampleRate);
				const silence = Array.from(
					{ length: this.#numberOfChannels },
					() => new Float32Array(length)
				);
				output.push(...(await this.#append(silence)));
				gapFrames -= length;
			}

			const planes = Array.from({ length: this.#numberOfChannels }, (_, planeIndex) => {
				const plane = new Float32Array(endFrame - startFrame);
				sample.copyTo(plane, {
					planeIndex,
					format: 'f32-planar',
					frameOffset: startFrame,
					frameCount: plane.length
				});
				return plane;
			});
			output.push(...(await this.#append(planes)));
			return output;
		} catch (error) {
			for (const emitted of output) emitted.close();
			throw error;
		}
	}

	async finish(): Promise<AudioSample[]> {
		if (this.#finished) return [];
		this.#finished = true;
		const buffers = this.#stretcher?.finalize() ?? null;
		this.#stretcher = null;
		return this.#emit(buffers);
	}

	dispose() {
		this.#finished = true;
		this.#stretcher = null;
	}

	#append(planes: Float32Array[]): Promise<AudioSample[]> {
		this.#inputFrames += planes[0].length;
		return this.#emit(this.#stretcher ? this.#stretcher.append(planes) : planes);
	}

	async #emit(buffers: Float32Array[] | null): Promise<AudioSample[]> {
		if (!buffers || buffers[0].length === 0) return [];
		const length = buffers[0].length;
		const data = new Float32Array(length * this.#numberOfChannels);
		for (let channel = 0; channel < this.#numberOfChannels; channel++) {
			data.set(buffers[channel], channel * length);
		}

		const sample = new AudioSample({
			format: 'f32-planar',
			sampleRate: this.#pitchedSampleRate,
			numberOfChannels: this.#numberOfChannels,
			timestamp: this.#outputFrames / this.#pitchedSampleRate,
			data
		});
		this.#outputFrames += length;
		if (!this.#audioProcess) return [sample];

		try {
			const processed = await this.#audioProcess(sample);
			const output = processed ? (Array.isArray(processed) ? processed : [processed]) : [];
			if (!output.includes(sample)) sample.close();
			return output;
		} catch (error) {
			sample.close();
			throw error;
		}
	}
}
