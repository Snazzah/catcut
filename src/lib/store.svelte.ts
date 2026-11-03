import { BlobSource, UrlSource } from 'mediabunny';

export type LocalMediaSource = {
	origin: 'local';
	file: File;
};

export type RemoteMediaSource = {
	origin: 'remote';
	url: string;
	name: string;
	size?: number;
	headers?: Record<string, string>;
};

export type MediaSource = LocalMediaSource | RemoteMediaSource;

export function createInputSource(source: MediaSource) {
	if (source.origin === 'local') return new BlobSource(source.file);
	return new UrlSource(source.url, { requestInit: { headers: source.headers } });
}

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
	#activeId = $state<number | null>(null);

	get active() {
		return this.entries.length > 0;
	}

	get activeEntry() {
		return this.entries[this.#activeIndex] ?? null;
	}

	get source() {
		return this.activeEntry?.source ?? null;
	}

	get #activeIndex() {
		return Math.max(
			0,
			this.entries.findIndex((entry) => entry.id === this.#activeId)
		);
	}

	get previousEntry() {
		return this.entries[this.#activeIndex - 1] ?? null;
	}

	get nextEntry() {
		return this.entries[this.#activeIndex + 1] ?? null;
	}

	add(...sources: MediaSource[]) {
		this.entries = [...this.entries, ...sources.map((source) => ({ id: this.#nextId++, source }))];
	}

	remove(id: number) {
		this.entries = this.entries.filter((e) => e.id !== id);
	}

	select(id: number) {
		if (this.entries.some((entry) => entry.id === id)) this.#activeId = id;
	}

	reorder(ids: readonly number[]) {
		if (ids.length !== this.entries.length || this.entries.some((entry) => !ids.includes(entry.id)))
			return;
		const entries: QueueEntry[] = [];
		for (const id of ids) {
			const entry = this.entries.find((entry) => entry.id === id);
			if (!entry) return;
			entries.push(entry);
		}
		this.#activeId = this.activeEntry?.id ?? null;
		this.entries = entries;
	}

	replace(...sources: (MediaSource | null)[]) {
		this.clear();
		this.add(...sources.filter((source) => source !== null));
	}

	clear() {
		this.entries = [];
		this.#activeId = null;
	}
}

export const queue = new Queue();
