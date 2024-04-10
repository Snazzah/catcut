// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { DropboxChooser } from "$lib/dropbox";
import { SteamSummary, SteamProfileItems } from "$lib/server/api";

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		interface PageData {
      profile?: SteamSummary;
      profileItems?: SteamProfileItems | null;
      year?: string;
    }
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
