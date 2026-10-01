import {
	ALL_FORMATS,
	BlobSource,
	BufferTarget,
	Conversion,
	Input,
	Mp3OutputFormat,
	Mp4OutputFormat,
	Output,
	StreamTarget,
	UrlSource,
	type CropRectangle
} from 'mediabunny';
import {
	createCropRectangle,
	createEditState,
	createTrimRange,
	editStateIntoConversionOptions,
	isFullFrameCrop,
	isFullTrimRange,
	type EditState,
	type TimelineRange,
	type AnyQuality,
	type AudioAdjustment
} from '$lib/editing';
import type { PlayerState } from '$lib/player-state.svelte';
import { getExportExtension, getMatchingOutputFormat } from '$lib/export-format';
import type { EditorToolId } from './editor-tools';

type EditorSessionState =
	Readonly<{ status: 'loading' }> | Readonly<{ status: 'ready'; edits: EditState }>;

type SaveState =
	| { status: 'idle' }
	| { status: 'complete' }
	| { status: 'converting'; progress: number }
	| { status: 'error'; message: string };

type ConversionJob = {
	input: Input;
	conversion: Conversion | null;
};

type SaveResult =
	{ kind: 'saved'; durationMs: number } | { kind: 'download'; file: File; durationMs: number };

export class EditorSession {
	readonly player: PlayerState;
	activeTool = $state<EditorToolId>('trim');
	state = $state.raw<EditorSessionState>({ status: 'loading' });
	saveState = $state.raw<SaveState>({ status: 'idle' });
	#job: ConversionJob | null = null;

	constructor(player: PlayerState) {
		this.player = player;
	}

	get ready() {
		return this.state.status === 'ready';
	}

	get saving() {
		return this.saveState.status === 'converting';
	}

	get hasChanges() {
		return this.trimChanged || this.cropChanged || this.audioChanged || this.qualityChanged;
	}

	async save(): Promise<SaveResult | null> {
		if (this.state.status !== 'ready' || !this.hasChanges || this.saving || !this.player.input)
			return null;
		const edits = this.state.edits;
		const source = this.player.source;
		const input = new Input({
			formats: ALL_FORMATS,
			source: source.origin === 'local' ? new BlobSource(source.file) : new UrlSource(source.url)
		});
		const job: ConversionJob = { input, conversion: null };
		this.#job = job;
		this.saveState = { status: 'converting', progress: 0 };
		this.player.pause();

		try {
			// Playback has already detected the format, so this keeps the save picker within user activation.
			const matchingFormat = getMatchingOutputFormat(await this.player.input.getFormat());
			const format =
				matchingFormat ?? (this.player.hasVideo ? new Mp4OutputFormat() : new Mp3OutputFormat());
			const name = this.player.filename.replace(/\.[^.]+$/, '');
			const extension = getExportExtension(format, this.player.filename);
			const suggestedName = `catcut_${name}${extension}`;
			let target: BufferTarget | StreamTarget;
			if (window.showSaveFilePicker) {
				const handle = await window.showSaveFilePicker({
					startIn: 'downloads',
					suggestedName,
					types: [{ description: 'Media file', accept: { [format.mimeType]: [extension] } }]
				});
				target = new StreamTarget(await handle.createWritable());
			} else {
				target = new BufferTarget();
			}
			const output = new Output({ format, target });
			const conversion = await Conversion.init({
				...editStateIntoConversionOptions({
					state: edits,
					bounds: this.timelineBounds,
					videoSize: this.player.videoSize,
					input,
					output
				}),
				tracks: 'primary',
				showWarnings: false
			});
			job.conversion = conversion;
			if (this.#job !== job) {
				await conversion.cancel();
				return null;
			}
			if (!conversion.isValid || conversion.discardedTracks.length > 0) {
				throw new Error(
					'This media could not be converted without losing an audio or video track.'
				);
			}
			conversion.onProgress = (progress) => {
				if (this.#job === job) this.saveState = { status: 'converting', progress };
			};
			const conversionStartedAt = performance.now();
			await conversion.execute();
			const durationMs = performance.now() - conversionStartedAt;
			if (!(target instanceof BufferTarget)) {
				this.saveState = { status: 'complete' };
				return { kind: 'saved', durationMs };
			}
			if (!target.buffer) throw new Error('The conversion did not produce a file.');
			const file = new File([target.buffer], suggestedName, {
				type: format.mimeType
			});
			this.saveState = { status: 'complete' };
			return { kind: 'download', file, durationMs };
		} catch (error) {
			if (this.#job === job) {
				this.saveState =
					error instanceof DOMException && error.name === 'AbortError'
						? { status: 'idle' }
						: {
								status: 'error',
								message: error instanceof Error ? error.message : String(error)
							};
			}
			return null;
		} finally {
			if (job.conversion?.state === 'idle' || job.conversion?.state === 'executing') {
				await job.conversion.cancel().catch(() => undefined);
			}
			input.dispose();
			if (this.#job === job) this.#job = null;
		}
	}

	cancelSave() {
		const job = this.#job;
		if (!job) return;
		this.#job = null;
		this.saveState = { status: 'idle' };
		if (job.conversion) {
			void job.conversion.cancel().catch(() => undefined);
		}
		job.input.dispose();
	}

	get trim() {
		return this.state.status === 'ready' ? this.state.edits.trim : null;
	}

	get crop() {
		return this.state.status === 'ready' ? this.state.edits.crop : null;
	}

	get trimChanged() {
		const trim = this.trim;
		return trim ? !isFullTrimRange(this.timelineBounds, trim) : false;
	}

	get cropChanged() {
		const crop = this.crop;
		const videoSize = this.player.videoSize;
		return crop && videoSize ? !isFullFrameCrop(videoSize, crop) : false;
	}

	get qualityChanged() {
		return this.state.status === 'ready'
			? this.state.edits.videoQuality !== null || this.state.edits.audioQuality !== null
			: false;
	}

	get videoQuality() {
		return this.state.status === 'ready' ? this.state.edits.videoQuality : null;
	}

	get audioQuality() {
		return this.state.status === 'ready' ? this.state.edits.audioQuality : null;
	}

	get audioAdjustment() {
		return this.state.status === 'ready' ? this.state.edits.audioAdjustment : null;
	}

	get audioChanged() {
		return this.audioAdjustment?.volume !== 1;
	}

	get timelineBounds(): TimelineRange {
		return { start: this.player.startTime, end: this.player.endTime };
	}

	initialize() {
		if (this.state.status === 'ready' || this.player.loadState.status !== 'ready') return;
		this.state = {
			status: 'ready',
			edits: createEditState({
				bounds: this.timelineBounds,
				videoSize: this.player.videoSize
			})
		};
	}

	updateTrim(nextTrim: TimelineRange) {
		if (this.state.status !== 'ready') return;
		this.state = {
			status: 'ready',
			edits: {
				...this.state.edits,
				trim: createTrimRange(this.timelineBounds, nextTrim.start, nextTrim.end)
			}
		};
	}

	updateCrop(nextCrop: CropRectangle) {
		if (this.state.status !== 'ready') return;
		const videoSize = this.player.videoSize;
		if (!videoSize) return;
		this.state = {
			status: 'ready',
			edits: {
				...this.state.edits,
				crop: createCropRectangle(videoSize, nextCrop)
			}
		};
	}

	updateVideoQuality(quality: AnyQuality | null) {
		if (this.state.status !== 'ready' || !this.player.hasVideo) return;
		this.state = {
			status: 'ready',
			edits: { ...this.state.edits, videoQuality: quality }
		};
	}

	updateAudioQuality(quality: AnyQuality | null) {
		if (this.state.status !== 'ready' || !this.player.hasAudio) return;
		this.state = {
			status: 'ready',
			edits: { ...this.state.edits, audioQuality: quality }
		};
	}

	updateAudioAdjustment(adjustment: AudioAdjustment) {
		if (this.state.status !== 'ready' || !this.player.hasAudio) return;
		this.state = {
			status: 'ready',
			edits: { ...this.state.edits, audioAdjustment: adjustment }
		};
	}

	resetTrim() {
		this.updateTrim(this.timelineBounds);
	}

	resetCrop() {
		const videoSize = this.player.videoSize;
		if (videoSize) this.updateCrop(createCropRectangle(videoSize));
	}

	resetQuality() {
		this.updateVideoQuality(null);
		this.updateAudioQuality(null);
	}

	resetAudio() {
		this.updateAudioAdjustment({ volume: 1 });
	}
}
