import { browser } from "$app/environment";
import { writable } from "svelte/store";

export const installEvent = writable<any>(null);

// This won't work while in dev, but build is fine
if (browser) {
	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		installEvent.set(e);
	});
	window.addEventListener('appinstalled', () => installEvent.set(null));
}
