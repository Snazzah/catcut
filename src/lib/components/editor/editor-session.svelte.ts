import {
	ALL_FORMATS,
	BlobSource,
	Input,
	MPEG_TS,
	Mp3OutputFormat,
	Mp4OutputFormat,
	Output,
	UrlSource,
	type CropRectangle
} from 'mediabunny';
import {
	createCropRectangle,
	createEditState,
	createTrimRange,
	editStateIntoAudioOptions,
	editStateIntoVideoOptions,
	isFullFrameCrop,
	isFullTrimRange,
	type EditState,
	type TimelineRange,
	type AnyQuality,
	type AudioAdjustment,
	type ResizeAdjustment,
	type SpeedAdjustment
} from '$lib/util/editing';
import type { PlayerState } from '$lib/player-state.svelte';
import {
	ExportTask,
	createExportDestination,
	exportFormats,
	getExportExtension,
	getMatchingOutputFormat,
	type ExportFormatId
} from '$lib/util/export';
import type { EditorToolId } from './editor-tools';
import { MetadataChangeSet } from './metadata-changeset.svelte';

type EditorSessionState =
	Readonly<{ status: 'loading' }> | Readonly<{ status: 'ready'; edits: EditState }>;

type SaveState =
	| { status: 'idle' }
	| { status: 'complete' }
	| { status: 'converting'; progress: number }
	| { status: 'error'; message: string };

type SaveJob = {
	input: Input;
	task: ExportTask | null;
};

type SaveResult =
	| { kind: 'saved'; durationMs: number }
	| { kind: 'download'; file: File; durationMs: number; dispose: () => Promise<void> };

export class EditorSession {
	readonly player: PlayerState;
	activeTool = $state<EditorToolId>('trim');
	speedPitchSynced = $state(false);
	outputFormat = $state<ExportFormatId | null>(null);
	state = $state.raw<EditorSessionState>({ status: 'loading' });
	saveState = $state.raw<SaveState>({ status: 'idle' });
	#job: SaveJob | null = null;
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
			this.speedChanged ||
			this.qualityChanged ||
			this.metadataChanged ||
			this.formatChanged
		);
	}

	get availableFormats() {
		return exportFormats.filter(({ format: Format }) => {
			const format = new Format();
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
		const job: SaveJob = { input, task: null };
		this.#job = job;
		this.saveState = { status: 'converting', progress: 0 };
		this.player.pause();
		let destination: Awaited<ReturnType<typeof createExportDestination>> | null = null;
		let downloadReady = false;

		try {
			const matchingFormat = getMatchingOutputFormat(await this.player.input.getFormat());
			if (this.#job !== job) return null;
			const format =
				(selectedFormat ? new selectedFormat.format() : null) ??
				matchingFormat ??
				(this.player.hasVideo ? new Mp4OutputFormat() : new Mp3OutputFormat());
			const name = this.player.filename.replace(/\.[^.]+$/, '');
			const extension = getExportExtension(format, selectedFormat ? '' : this.player.filename);
			const suggestedName = `catcut_${name}${extension}`;
			destination = await createExportDestination({ format, suggestedName, extension });
			if (this.#job !== job) return null;
			const output = new Output({ format, target: destination.target });
			const task = new ExportTask({
				input,
				output,
				video: editStateIntoVideoOptions({ state: edits, videoSize: this.player.videoSize }),
				audio: editStateIntoAudioOptions(edits),
				trim: edits.trim,
				adjustment: edits.speedAdjustment,
				tags,
				onProgress: (progress) => {
					if (this.#job === job) this.saveState = { status: 'converting', progress };
				}
			});
			job.task = task;
			const conversionStartedAt = performance.now();
			await task.execute();
			if (this.#job !== job) return null;
			const durationMs = performance.now() - conversionStartedAt;
			if (destination.kind === 'saved') {
				this.saveState = { status: 'complete' };
				return { kind: 'saved', durationMs };
			}
			const file = await destination.getFile();
			if (this.#job !== job) return null;
			downloadReady = true;
			this.saveState = { status: 'complete' };
			return { kind: 'download', file, durationMs, dispose: destination.dispose };
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
			if (job.task) await job.task.cancel();
			else input.dispose();
			if (destination && !downloadReady) await destination.dispose().catch(() => {});
			if (this.#job === job) this.#job = null;
		}
	}

	cancelSave() {
		const job = this.#job;
		if (!job) return;
		this.#job = null;
		this.saveState = { status: 'idle' };
		if (job.task) void job.task.cancel();
		else job.input.dispose();
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

	get speedAdjustment() {
		return this.state.status === 'ready' ? this.state.edits.speedAdjustment : null;
	}

	get speedChanged() {
		const adjustment = this.speedAdjustment;
		return adjustment ? adjustment.speed !== 1 || adjustment.pitchSemitones !== 0 : false;
	}

	updateSpeedAdjustment(adjustment: SpeedAdjustment) {
		if (this.state.status !== 'ready' || this.saving) return;
		this.state = {
			status: 'ready',
			edits: {
				...this.state.edits,
				speedAdjustment: this.speedPitchSynced
					? { ...adjustment, pitchSemitones: 12 * Math.log2(adjustment.speed) }
					: adjustment
			}
		};
	}

	toggleSpeedPitchSync() {
		if (this.state.status !== 'ready' || this.saving || !this.player.hasAudio) return;
		this.speedPitchSynced = !this.speedPitchSynced;
		if (this.speedPitchSynced) this.updateSpeedAdjustment(this.state.edits.speedAdjustment);
	}

	resetSpeed() {
		this.updateSpeedAdjustment({ speed: 1, pitchSemitones: 0 });
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
