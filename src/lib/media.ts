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

export function createRemoteMediaSource(value: string): RemoteMediaSource | null {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return null;
	}

	if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

	const pathname = url.pathname.replace(/\/$/, '');
	const encodedName = pathname.slice(pathname.lastIndexOf('/') + 1);
	let name = encodedName;
	try {
		name = decodeURIComponent(encodedName);
	} catch {}
	if (!name) name = url.hostname;

	return { origin: 'remote', url: url.href, name };
}
