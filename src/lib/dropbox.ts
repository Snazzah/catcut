import { PUBLIC_DROPBOX_CLIENT_ID } from '$env/static/public';

export const dropboxAllowed = !!PUBLIC_DROPBOX_CLIENT_ID;

export function loadDropbox() {
	if (document.querySelector('#dropboxjs')) return Promise.resolve();

	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.id = 'dropboxjs';
		script.type = 'application/javascript';
		script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
		script.setAttribute('data-app-key', PUBLIC_DROPBOX_CLIENT_ID);

		script.onload = resolve;
		script.onerror = reject;

		document.head.append(script);
	});
}

export interface DropboxChooser {
	choose(options: DropboxChooserOptions): void;
}

export interface DropboxChooserOptions {
	success(files: DropboxFile[]): void;
	cancel?: () => void;
	linkType?: 'preview' | 'direct';
	multiselect?: boolean;
	extensions?: string[];
	folderselect?: boolean;
	sizeLimit?: number;
}

export interface DropboxFile {
	id: string;
	name: string;
	link: string;
	bytes: number;
	icon: string;
	thumbnailLink: string;
	isDir: boolean;
}
