// Modified version of Vanilagy's gist to fix some final buffer things
// https://gist.github.com/Vanilagy/05f7901f4c4398356657e3a86c7aee05

/**
 * Utility class for performing time stretching on a multi-channel audio signal. The input audio will be stretched by
 * a configurable factor without changing its pitch.
 *
 * Internally, this uses a WSOLA-like algorithm.
 */
export class TimeStretcher {
  readonly factor: number;

  private inputFrames = 0;
  private outputFrames = 0;
  private consumedFrames = 0;

  private numberOfChannels: number;
  private synthesisHopSize: number;
  private windowSize: number;
  private overlapSize: number;
  private tolerance: number;
  private buffers: Float32Array[];
  private bufferEndIndex: number;
  private outputBuffers: Float32Array[];
  private nextOutputBufferShiftAmount: number;
  private outputBufferLength: number;
  private hasDoneOutput: boolean;
  private finalized: boolean;
  private blendValues: number[];

  constructor(numberOfChannels: number, sampleRate: number, factor: number) {
    this.numberOfChannels = numberOfChannels;
    this.synthesisHopSize = Math.floor((512 * sampleRate) / 48000);
    this.windowSize = 2 * this.synthesisHopSize;
    this.overlapSize = this.synthesisHopSize;
    this.tolerance = this.synthesisHopSize;
    this.buffers = [];
    this.bufferEndIndex = this.tolerance;
    this.factor = factor;
    this.outputBuffers = [];
    this.nextOutputBufferShiftAmount = 0;
    this.outputBufferLength = 2 ** 16;
    this.hasDoneOutput = false;
    this.finalized = false;

    for (let i = 0; i < numberOfChannels; i++) {
      this.buffers.push(new Float32Array(2 ** 16));
      this.outputBuffers.push(new Float32Array(this.outputBufferLength));
    }

    this.blendValues = [];
    for (let i = 0; i < this.overlapSize; i++) {
      this.blendValues[i] = 0.5 * (1 - Math.cos((Math.PI * i) / this.overlapSize));
    }
  }

  private ensureOutputBufferLength(requiredLength: number): void {
    if (requiredLength > this.outputBufferLength) {
      this.outputBufferLength = requiredLength;
      for (let i = 0; i < this.numberOfChannels; i++) {
        const largerBuffer = new Float32Array(this.outputBufferLength);
        largerBuffer.set(this.outputBuffers[i], 0);
        this.outputBuffers[i] = largerBuffer;
      }
    }
  }

  private clearOutputBuffers(): void {
    if (this.nextOutputBufferShiftAmount > 0) {
      for (let i = 0; i < this.numberOfChannels; i++) {
        const buffer = this.outputBuffers[i];
        buffer.set(buffer.subarray(this.nextOutputBufferShiftAmount), 0);
      }

      this.nextOutputBufferShiftAmount = 0;
    }
  }

  private synthesizeSegment(
    i: number,
    windowSize: number,
    inputStartPos: number,
    maxPositiveOffset: number = this.tolerance,
  ): void {
    const crossCorrelateAllChannels = (k: number): number => {
      let dot = 0;
      let normOldTotal = 0;
      let normNewTotal = 0;

      for (let chan = 0; chan < this.numberOfChannels; chan++) {
        const inputBuffer = this.buffers[chan];
        const outputBuffer = this.outputBuffers[chan];

        for (let j = 0; j < this.overlapSize; j++) {
          const oldValue = outputBuffer[i + j];
          const newValue = inputBuffer[inputStartPos + k + j];

          dot += oldValue * newValue;
          normOldTotal += oldValue ** 2;
          normNewTotal += newValue ** 2;
        }
      }

      const ncc = dot / (Math.sqrt(normOldTotal * normNewTotal) || 1e-10);
      return ncc;
    };

    let bestCorr = -Infinity;
    let bestOffset = 0;

    if (!this.hasDoneOutput || this.factor === 1) {
      bestOffset = 0;
    } else {
      let k = -this.tolerance;
      bestCorr = crossCorrelateAllChannels(k);
      bestOffset = k;

      const minStepSize = 1;
      const maxStepSize = 16;
      let prevCorr = bestCorr;

      while (k < maxPositiveOffset) {
        const nextK = Math.min(k + 1, maxPositiveOffset);
        const corr = crossCorrelateAllChannels(nextK);

        const gradient = Math.abs(corr - prevCorr);
        const adaptiveStep = Math.max(
          minStepSize,
          Math.min(maxStepSize, Math.floor(maxStepSize * Math.exp(-gradient * 3))),
        );

        if (corr > bestCorr) {
          bestCorr = corr;
          bestOffset = nextK;
        }

        prevCorr = corr;
        k += adaptiveStep;
      }

      // Fine-tuning phase
      const fineRange = 8;
      for (k = bestOffset - fineRange; k <= bestOffset + fineRange; k++) {
        if (k >= -this.tolerance && k <= maxPositiveOffset) {
          const corr = crossCorrelateAllChannels(k);
          if (corr > bestCorr) {
            bestCorr = corr;
            bestOffset = k;
          }
        }
      }
    }

    for (let chan = 0; chan < this.numberOfChannels; chan++) {
      const inputBuffer = this.buffers[chan];
      const outputBuffer = this.outputBuffers[chan];

      for (let j = 0; j < windowSize; j++) {
        const blendValue = j < this.overlapSize ? this.blendValues[j] : 1;
        outputBuffer[i + j] *= 1 - blendValue;
        outputBuffer[i + j] += blendValue * inputBuffer[inputStartPos + bestOffset + j];
      }
    }

    this.hasDoneOutput = true;
  }

  append(newBuffers: Float32Array[]): Float32Array[] | null {
    if (this.finalized) {
      throw new Error('Cannot append more buffers after calling finalize.');
    }

    for (let i = 0; i < this.numberOfChannels; i++) {
      const newBuffer = newBuffers[i];
      const requiredLength = this.bufferEndIndex + newBuffer.length;
      let currentLength = this.buffers[i].length;

      while (currentLength < requiredLength) {
        currentLength *= 2;
      }

      if (currentLength !== this.buffers[i].length) {
        const largerBuffer = new Float32Array(currentLength);
        largerBuffer.set(this.buffers[i], 0);
        this.buffers[i] = largerBuffer;
      }

      this.buffers[i].set(newBuffer, this.bufferEndIndex);
    }

    this.bufferEndIndex += newBuffers[0].length;
    this.inputFrames += newBuffers[0].length;

    return this.process();
  }

  private process(final = false): Float32Array[] | null {
    const remaining = Math.round(this.inputFrames * this.factor) - this.outputFrames;
    const inputPosition = (offset: number) =>
      this.tolerance +
      Math.floor((this.outputFrames + offset) / this.factor) -
      this.consumedFrames;

    let length = 0;
    while (length < remaining) {
      if (!final && (
        length + this.synthesisHopSize > remaining ||
        inputPosition(length) + this.windowSize + this.tolerance > this.bufferEndIndex
      )) break;

      length += Math.min(this.synthesisHopSize, remaining - length);
    }
    if (length === 0) return null;

    if (final) {
      // Extend last bits with zeros
      const required = inputPosition(length) + this.windowSize + this.tolerance;
      for (let channel = 0; channel < this.numberOfChannels; channel++) {
        let buffer = this.buffers[channel];
        if (buffer.length < required) {
          const larger = new Float32Array(required);
          larger.set(buffer);
          buffer = this.buffers[channel] = larger;
        }
        buffer.fill(0, this.bufferEndIndex, required);
      }
    }

    this.clearOutputBuffers();
    this.ensureOutputBufferLength(length + this.windowSize);
    for (let offset = 0; offset < length; offset += this.synthesisHopSize) {
      this.synthesizeSegment(offset, this.windowSize, inputPosition(offset));
    }

    this.outputFrames += length;
    if (!final) {
      const consumed = Math.floor(this.outputFrames / this.factor);
      const shift = consumed - this.consumedFrames;
      for (const buffer of this.buffers) {
        buffer.copyWithin(0, shift, this.bufferEndIndex);
      }
      this.bufferEndIndex -= shift;
      this.consumedFrames = consumed;
    }

    this.nextOutputBufferShiftAmount = length;
    return this.outputBuffers.map(buffer => buffer.subarray(0, length));
  }

  finalize(): Float32Array[] | null {
    if (this.finalized) return null;
    this.finalized = true;
    return this.process(true);
  }
}
