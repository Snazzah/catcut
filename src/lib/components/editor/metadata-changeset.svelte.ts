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

// Raw tag keys Mediabunny reads each field from, across all types
// This is to make sure that `raw` tags don't re-create fields that are intended to be deleted
const rawFieldKeys: Record<MetadataFieldDefinition['key'], string[]> = {
	title: [
		'TIT2',
		'TT2',
		'TITLE',
		'©nam',
		'name',
		'titl',
		'com.apple.quicktime.title',
		'INAM',
		'TITL'
	],
	artist: ['TPE1', 'TP1', 'ARTIST', '©ART', 'com.apple.quicktime.artist', 'IART'],
	album: ['TALB', 'TAL', 'ALBUM', '©alb', 'albm', 'com.apple.quicktime.album', 'IPRD'],
	albumArtist: ['TPE2', 'TP2', 'ALBUMARTIST', 'aART', 'album_artist'],
	trackNumber: [
		'TRCK',
		'TRK',
		'TRACKNUMBER',
		'TRACKTOTAL',
		'trkn',
		'track',
		'track_number',
		'part_number',
		'IPRT',
		'ITRK'
	],
	discNumber: ['TPOS', 'TPA', 'DISCNUMBER', 'DISCTOTAL', 'disk', 'disc', 'disc_number'],
	genre: ['TCON', 'TCO', 'GENRE', '©gen', 'gnre', 'com.apple.quicktime.genre', 'IGNR', 'GENR'],
	comment: ['COMM', 'COM', 'COMMENT', '©cmt', 'com.apple.quicktime.comment', 'ICMT', 'CMNT']
};

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

	reset() {
		for (const field of metadataFields) {
			this.resetField(field.key);
			if (field.type === 'number-total') this.resetField(field.total);
		}
		this.cover = this.original.images;
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
		const staleRawKeys = metadataFields
			.filter(
				(field) =>
					this.fieldChanged(field.key) ||
					(field.type === 'number-total' && this.fieldChanged(field.total))
			)
			.flatMap((field) => rawFieldKeys[field.key].map((key) => key.toLowerCase()));
		if (tags.raw && staleRawKeys.length)
			// Matroska tag names are case-insensitive, so match raw keys loosely
			tags.raw = Object.fromEntries(
				Object.entries(tags.raw).filter(([key]) => !staleRawKeys.includes(key.toLowerCase()))
			);
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
