import {
	ALL_FORMATS,
	BlobSource,
	Input,
	UrlSource,
	type AudioCodec,
	type MetadataTags,
	type VideoCodec
} from 'mediabunny';
import type { MediaSource } from '$lib/media';

type PlayerMetadata = {
	duration: number;
	mimeType: string;
	tags: MetadataTags;
	video: {
		codec: VideoCodec | null;
		width: number;
		height: number;
	} | null;
	audio: {
		codec: AudioCodec | null;
		sampleRate: number;
		channels: number;
	} | null;
};

export type PlayerLoadState = { status: 'loading' } | { status: 'ready'; metadata: PlayerMetadata };

export class PlayerState {
	readonly source: MediaSource;
	loadState = $state.raw<PlayerLoadState>({ status: 'loading' });
	sourceUrl = $state<string | null>(null);
	currentTime = $state(0);
	paused = $state(true);
	disposed = false;

	#input: Input | null = null;
	#objectUrl: string | null = null;

	constructor(source: MediaSource) {
		this.source = source;
	}

	get filename() {
		return this.source.origin === 'local' ? this.source.file.name : this.source.name;
	}

	get duration() {
		return this.loadState.status === 'ready' ? this.loadState.metadata.duration : 0;
	}

	get progress() {
		return this.duration > 0 ? this.currentTime / this.duration : 0;
	}

	async load() {
		this.loadState = { status: 'loading' };
		this.sourceUrl = this.#getSourceUrl();

		const input = new Input({
			formats: ALL_FORMATS,
			source:
				this.source.origin === 'local'
					? new BlobSource(this.source.file)
					: new UrlSource(this.source.url)
		});
		this.#input = input;

		const [videoTrack, audioTrack, mimeType, tags] = await Promise.all([
			input.getPrimaryVideoTrack(),
			input.getPrimaryAudioTrack(),
			input.getMimeType(),
			input.getMetadataTags()
		]);

		if (!videoTrack && !audioTrack) {
			throw new Error('No audio or video track found.');
		}

		const tracks = [videoTrack, audioTrack].filter((track) => track !== null);
		const duration =
			(await input.getDurationFromMetadata(tracks, { skipLiveWait: true })) ??
			(await input.computeDuration(tracks, { skipLiveWait: true }));

		const [video, audio] = await Promise.all([
			videoTrack
				? Promise.all([
						videoTrack.getCodec(),
						videoTrack.getDisplayWidth(),
						videoTrack.getDisplayHeight()
					]).then(([codec, width, height]) => ({ codec, width, height }))
				: null,
			audioTrack
				? Promise.all([
						audioTrack.getCodec(),
						audioTrack.getSampleRate(),
						audioTrack.getNumberOfChannels()
					]).then(([codec, sampleRate, channels]) => ({ codec, sampleRate, channels }))
				: null
		]);

		if (this.disposed || input !== this.#input) return;

		this.loadState = {
			status: 'ready',
			metadata: { duration, mimeType, tags, video, audio }
		};
	}

	dispose() {
		this.disposed = true;
		this.#input?.dispose();
		this.#input = null;

		if (this.#objectUrl) URL.revokeObjectURL(this.#objectUrl);
		this.#objectUrl = null;
		this.sourceUrl = null;
	}

	#getSourceUrl() {
		if (this.source.origin === 'remote') return this.source.url;

		this.#objectUrl = URL.createObjectURL(this.source.file);
		return this.#objectUrl;
	}
}
