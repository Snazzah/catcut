import { browser } from '$app/env';

interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let installEvent = $state.raw<BeforeInstallPromptEvent | null>(null);

// NOTE this won't fire in dev, but build is fine
if (browser) {
	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		installEvent = e as BeforeInstallPromptEvent;
	});
	window.addEventListener('appinstalled', () => (installEvent = null));
}

export const install = {
	get available() {
		return installEvent !== null;
	},
	async prompt() {
		const event = installEvent;
		if (!event) return;
		await event.prompt();
		await event.userChoice;
		// The event can only be prompted once, the browser fires a new one if it's still installable
		if (installEvent === event) installEvent = null;
	}
};

let waitingWorker = $state.raw<ServiceWorker | null>(null);

export const update = {
	get available() {
		return waitingWorker !== null;
	},
	track(registration: ServiceWorkerRegistration) {
		const worker = registration.waiting;
		if (!worker || !navigator.serviceWorker.controller || worker === waitingWorker) return false;
		waitingWorker = worker;
		return true;
	},
	apply() {
		waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
	}
};
