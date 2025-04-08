// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { DropboxChooser } from '$lib/dropbox';

type PlausibleInitOptions = {
	readonly hashMode?: boolean;
	readonly trackLocalhost?: boolean;
	readonly domain?: Location['hostname'];
	readonly apiHost?: string;
};

type PlausibleEventData = {
	readonly url?: Location['href'];
	readonly referrer?: Document['referrer'] | null;
	readonly deviceWidth?: Window['innerWidth'];
};

type PlausibleOptions = PlausibleInitOptions & PlausibleEventData;

type CallbackArgs = {
	readonly status: number;
};

export type EventOptions = {
	readonly callback?: (args: CallbackArgs) => void;
	readonly props?: { readonly [propName: string]: string | number | boolean };
};

type TrackEvent = ((
	eventName: string,
	options?: EventOptions,
	eventData?: PlausibleOptions
) => void) & { q?: any[] };

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
		plausible: TrackEvent;
	}

	namespace svelteHTML {
		// This just stops the type errors? ok.
		interface IntrinsicElements extends svelteElements.SvelteHTMLElements {
			audio: HTMLProps<'audio', HTMLAttributes>;
			video: HTMLProps<'video', HTMLAttributes>;
		}
	}
}

export {};
