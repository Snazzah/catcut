import type { CropRectangle, QualityLevel } from 'mediabunny';
import {
	createCropRectangle,
	createEditState,
	createTrimRange,
	isFullFrameCrop,
	isFullTrimRange,
	type EditState,
	type TimelineRange
} from '$lib/editing';
import type { PlayerState } from '$lib/player-state.svelte';
import type { EditorToolId } from './editor-tools';

type EditorSessionState =
	Readonly<{ status: 'loading' }> | Readonly<{ status: 'ready'; edits: EditState }>;

export class EditorSession {
	readonly player: PlayerState;
	activeTool = $state<EditorToolId>('trim');
	state = $state.raw<EditorSessionState>({ status: 'loading' });

	constructor(player: PlayerState) {
		this.player = player;
	}

	get ready() {
		return this.state.status === 'ready';
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

	updateVideoQuality(quality: QualityLevel | null) {
		if (this.state.status !== 'ready' || !this.player.hasVideo) return;
		this.state = {
			status: 'ready',
			edits: { ...this.state.edits, videoQuality: quality }
		};
	}

	updateAudioQuality(quality: QualityLevel | null) {
		if (this.state.status !== 'ready' || !this.player.hasAudio) return;
		this.state = {
			status: 'ready',
			edits: { ...this.state.edits, audioQuality: quality }
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
}
