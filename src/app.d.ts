// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { DropboxChooser } from '$lib/dropbox';

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface Window {
		gapi: any;
		google: any;
		Dropbox: DropboxChooser;
	}
}

export {};
