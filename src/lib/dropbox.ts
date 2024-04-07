const APP_KEY = 'gckh0f9o51dl0vf';

export async function loadDropbox() {
	if (document.querySelector('#dropboxjs')) return Promise.resolve();

	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.id = 'dropboxjs';
		script.type = 'application/javascript';
		script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
		script.setAttribute('data-app-key', APP_KEY);

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
	linkType?: 'preview' | 'direct',
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
