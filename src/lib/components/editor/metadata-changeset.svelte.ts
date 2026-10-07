import type { MetadataTags } from 'mediabunny';

export const metadataFields = [
	{ type: 'text', key: 'title', label: 'Title' },
	{ type: 'text', key: 'artist', label: 'Artist' },
	{ type: 'text', key: 'album', label: 'Album' },
	{ type: 'text', key: 'albumArtist', label: 'Album Artist' },
	{ type: 'number-total', key: 'trackNumber', total: 'tracksTotal', label: 'Track' },
	{ type: 'number-total', key: 'discNumber', total: 'discsTotal', label: 'Disc' },
	{ type: 'text', key: 'genre', label: 'Genre' },
	{ type: 'text', key: 'comment', label: 'Comment' }
] as const;

type MetadataFieldDefinition = (typeof metadataFields)[number];
type MetadataField =
	| MetadataFieldDefinition['key']
	| Extract<MetadataFieldDefinition, { type: 'number-total' }>['total'];

export class MetadataChangeSet {
	readonly original: MetadataTags;
	values = $state<Pick<MetadataTags, MetadataField>>({});
	cover = $state.raw<MetadataTags['images']>(undefined);

	constructor(original: MetadataTags) {
		this.original = original;
		this.values = {
			title: original.title,
			artist: original.artist,
			album: original.album,
			albumArtist: original.albumArtist,
			trackNumber: original.trackNumber,
			tracksTotal: original.tracksTotal,
			discNumber: original.discNumber,
			discsTotal: original.discsTotal,
			genre: original.genre,
			comment: original.comment
		};
		this.cover = original.images;
	}

	fieldChanged(field: MetadataField) {
		return (this.values[field] ?? '') !== (this.original[field] ?? '');
	}

	resetField(field: MetadataField) {
		this.values = { ...this.values, [field]: this.original[field] };
	}

	get coverChanged() {
		if (!this.cover?.length && !this.original.images?.length) return false;
		return this.cover !== this.original.images;
	}

	get hasChanges() {
		return (
			metadataFields.some(
				(field) =>
					this.fieldChanged(field.key) ||
					(field.type === 'number-total' && this.fieldChanged(field.total))
			) || this.coverChanged
		);
	}

	toMetadataTags(): MetadataTags {
		const tags = {
			...this.original,
			...this.values,
			images: this.cover ? [...this.cover] : undefined
		};
		for (const field of metadataFields) {
			if (field.type === 'text') {
				if (!tags[field.key]?.trim()) delete tags[field.key];
			} else {
				if (tags[field.key] === undefined) delete tags[field.key];
				if (tags[field.total] === undefined) delete tags[field.total];
			}
		}
		return tags;
	}
}
