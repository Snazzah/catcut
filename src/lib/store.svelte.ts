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

export type QueueEntry = {
	id: number;
	source: MediaSource;
};

export class Queue {
	entries = $state.raw<readonly QueueEntry[]>([]);
	#nextId = 0;

	get activeEntry() {
		return this.entries[0] ?? null;
	}

	get source() {
		return this.activeEntry?.source ?? null;
	}

	add(...sources: MediaSource[]) {
		this.entries = [...this.entries, ...sources.map((source) => ({ id: this.#nextId++, source }))];
	}

	remove(id: number) {
		this.entries = this.entries.filter((e) => e.id !== id);
	}

	replace(source: MediaSource | null) {
		if (source === null) {
			this.clear();
			return;
		}

		this.entries = [{ id: this.#nextId++, source }];
	}

	clear() {
		this.entries = [];
	}
}

export const queue = new Queue();
