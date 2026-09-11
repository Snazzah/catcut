export type LocalMediaSource = {
	origin: 'local';
	file: File;
};

export type RemoteMediaSource = {
	origin: 'remote';
	url: string;
	name: string;
	size?: number;
};

export type MediaSource = LocalMediaSource | RemoteMediaSource;

export function createLocalMediaSource(file: File): LocalMediaSource {
	return { origin: 'local', file };
}
