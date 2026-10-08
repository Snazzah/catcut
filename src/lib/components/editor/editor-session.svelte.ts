import {
	ALL_FORMATS,
	BlobSource,
	BufferTarget,
	Conversion,
	Input,
	MPEG_TS,
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
	type AudioAdjustment,
	type ResizeAdjustment
} from '$lib/editing';
import type { PlayerState } from '$lib/player-state.svelte';
import {
	exportFormats,
	getExportExtension,
	getMatchingOutputFormat,
	type ExportFormatId
} from '$lib/export-format';
import type { EditorToolId } from './editor-tools';
import { MetadataChangeSet } from './metadata-changeset.svelte';

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
	outputFormat = $state<ExportFormatId | null>(null);
	state = $state.raw<EditorSessionState>({ status: 'loading' });
	saveState = $state.raw<SaveState>({ status: 'idle' });
	#job: ConversionJob | null = null;
	#metadataAvailable = $state(false);
	#sourceFormatExtension = $state<string | null>(null);
	metadata = $state<MetadataChangeSet | null>(null);

	constructor(player: PlayerState) {
		this.player = player;
	}

	get ready() {
		return this.state.status === 'ready';
	}

	get metadataAvailable() {
		return this.ready && this.#metadataAvailable;
	}

	get saving() {
		return this.saveState.status === 'converting';
	}

	get metadataChanged() {
		return this.metadata?.hasChanges ?? false;
	}

	get hasChanges() {
		return (
			this.trimChanged ||
			this.cropChanged ||
			this.resizeChanged ||
			this.audioChanged ||
			this.qualityChanged ||
			this.metadataChanged ||
			this.formatChanged
		);
	}

	get availableFormats() {
		return exportFormats.filter(({ create }) => {
			const format = create();
			return (
				format.fileExtension !== this.#sourceFormatExtension &&
				(this.player.hasVideo || format.getSupportedVideoCodecs().length === 0) &&
				(!this.player.hasVideo ||
					format.getSupportedVideoCodecs().length > 0 ||
					(this.player.hasAudio && format.getSupportedAudioCodecs().length > 0)) &&
				(!this.player.hasAudio || format.getSupportedAudioCodecs().length > 0)
			);
		});
	}

	get formatChanged() {
		return this.outputFormat !== null;
	}

	updateFormat(format: ExportFormatId | null) {
		if (!this.ready || this.saving) return;
		if (format !== null && !this.availableFormats.some(({ id }) => id === format)) return;
		this.outputFormat = format;
	}

	resetFormat() {
		this.updateFormat(null);
	}

	async save(): Promise<SaveResult | null> {
		if (this.state.status !== 'ready' || !this.hasChanges || this.saving || !this.player.input)
			return null;
		const edits = this.state.edits;
		const selectedFormat = exportFormats.find(({ id }) => id === this.outputFormat);
		const tags = this.metadataChanged ? this.metadata?.toMetadataTags() : undefined;
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
			const matchingFormat = getMatchingOutputFormat(await this.player.input.getFormat());
			const format =
				selectedFormat?.create() ??
				matchingFormat ??
				(this.player.hasVideo ? new Mp4OutputFormat() : new Mp3OutputFormat());
			const name = this.player.filename.replace(/\.[^.]+$/, '');
			const extension = getExportExtension(format, selectedFormat ? '' : this.player.filename);
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
			const audioOnly = this.player.hasVideo && format.getSupportedVideoCodecs().length === 0;
			const conversion = await Conversion.init({
				...editStateIntoConversionOptions({
					state: edits,
					bounds: this.timelineBounds,
					videoSize: this.player.videoSize,
					input,
					output
				}),
				...(audioOnly && { video: { discard: true } }),
				tracks: 'primary',
				tags,
				showWarnings: false
			});
			job.conversion = conversion;
			if (this.#job !== job) {
				await conversion.cancel();
				return null;
			}
			if (
				!conversion.isValid ||
				conversion.discardedTracks.some(
					({ track, reason }) =>
						!(audioOnly && track.type === 'video' && reason === 'discarded_by_user')
				)
			) {
				throw new Error('This media could not be converted without losing a track.');
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

	get resize() {
		return this.state.status === 'ready' ? this.state.edits.resize : null;
	}

	get resizeChanged() {
		const resize = this.resize;
		return resize ? resize.width > 0 || resize.height > 0 : false;
	}

	updateResize(resize: ResizeAdjustment) {
		if (this.state.status !== 'ready' || !this.player.hasVideo) return;
		this.state = {
			status: 'ready',
			edits: { ...this.state.edits, resize }
		};
	}

	resetResize() {
		this.updateResize({ width: 0, height: 0, fit: 'fill' });
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
		this.metadata = new MetadataChangeSet(this.player.loadState.metadata.tags);
		this.player.input?.getFormat().then(
			(format) => {
				this.#metadataAvailable = format !== MPEG_TS;
				this.#sourceFormatExtension = getMatchingOutputFormat(format)?.fileExtension ?? null;
				if (!this.availableFormats.some(({ id }) => id === this.outputFormat))
					this.outputFormat = null;
			},
			() => (this.#metadataAvailable = false)
		);
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
