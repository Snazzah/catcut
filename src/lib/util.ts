import { get } from 'svelte/store';
import { googleDriveData } from './data';
import { parse } from './contentDisposition';

export const ALLOWED_TYPES = [
	'video/mp4',
	'video/webm',
	'video/quicktime',
	'video/m4v',
	'video/x-matroska',
	'audio/mpeg',
	'audio/wav',
	'audio/flac',
	'audio/ogg',
	'audio/x-m4a'
];
export const MS_OPTIONS = {
	colonNotation: true,
	secondsDecimalDigits: 2,
	keepDecimalsOnWholeSeconds: true
};

export function validEvent(e: MouseEvent) {
	return (e as any).pointerType !== '';
}

export function relativeTime(rtf: Intl.RelativeTimeFormat, seconds: number) {
	if (Math.abs(seconds) < 60) return rtf.format(seconds, 'second');
	if (Math.abs(seconds) <= 3600) return rtf.format(Math.round(seconds / 60), 'minute');
	if (Math.abs(seconds) <= 86400) return rtf.format(Math.round(seconds / 3600), 'hour');
	if (Math.abs(seconds) <= 2592000) return rtf.format(Math.round(seconds / 86400), 'day');
	if (Math.abs(seconds) <= 31536000) return rtf.format(Math.round(seconds / 2592000), 'month');
	return rtf.format(Math.round(seconds / 31536000), 'year');
}

export function blobToDataURL(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

export function splitFilename(filename: string): [string, string] {
	const reverseParts = filename.split('.').reverse();
	return [reverseParts.slice(1).reverse().join('.'), reverseParts[0]];
}

export class RemoteFile {
	type: string;
	originalURL?: string;
	blob?: Blob;

	constructor(
		public name: string,
		public size: number,
		public url: string,
		type?: string
	) {
		this.type =
			type ?? name.includes('.') ? RemoteFile.extensionToType(name.split('.').reverse()[0]) : '';
	}

	static extensionToType(extension: string) {
		if (extension === 'mov') return 'video/quicktime';
		if (extension === 'mkv') return 'video/x-matroska';
		if (extension === 'mp3') return 'audio/mpeg';
		if (['webm', 'mp4', 'm4a'].includes(extension)) return `video/${extension}`;
		if (['ogg', 'wav', 'flac'].includes(extension)) return `audio/${extension}`;
		return '';
	}

	static async fetch(url: string, name?: string, type?: string) {
		const googleAuth = get(googleDriveData);
		const response = await fetch(url, {
			headers:
				url.startsWith('https://content.googleapis.com/') && googleAuth
					? {
							Authorization: `${googleAuth.token_type} ${googleAuth.access_token}`
						}
					: {}
		});

		if (!name && response.headers.has('Content-Disposition')) {
			const disposition = parse(response.headers.get('Content-Disposition')!);
			if (disposition.params.filename) name = disposition.params.filename;
		}

		if (!name) name = url.split('/').reverse()[0];
		const blob = await response.blob();
		const file = new RemoteFile(name, blob.size, URL.createObjectURL(blob), type || blob.type);
		file.originalURL = url;
		file.blob = blob;
		return file;
	}

	release() {
		if (this.url.startsWith('blob:')) URL.revokeObjectURL(this.url);
	}
}

export enum ProcessingState {
	IDLE,
	WRITING,
	RUNNING,
	READING,
	DONE,
	ERROR
}

export function clamp(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, n));
}
