import { browser } from '$app/env';

const STORAGE_KEY = 'catcut-settings';

export type Settings = {
	analytics: boolean;
};

const defaults: Settings = {
	analytics: true
};

function read(): Settings {
	if (!browser) return { ...defaults };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...defaults };
		const parsed = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
			return { ...defaults };

		const result = { ...defaults };
		for (const key of Object.keys(defaults) as (keyof Settings)[]) {
			if (key in parsed && typeof parsed[key] === typeof defaults[key]) result[key] = parsed[key];
		}
		return result;
	} catch {
		return { ...defaults };
	}
}

function write(value: Settings) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
	} catch (e) {
		console.warn('Failed to save settings', e);
	}
}

export const settings: Settings = $state(read());

export function resetSettings() {
	Object.assign(settings, defaults);
}

if (browser) {
	$effect.root(() => {
		// Set settings on every change
		$effect(() => write($state.snapshot(settings)));

		// Set to ignore plausible when analytics is off
		$effect(() => {
			if (settings.analytics) localStorage.removeItem('plausible_ignore');
			else localStorage.setItem('plausible_ignore', 'true');
		});
	});

	// Update storage if it changes elsewhere
	window.addEventListener('storage', (event) => {
		if (event.storageArea !== localStorage) return;
		if (event.key !== STORAGE_KEY && event.key !== null) return;
		Object.assign(settings, read());
	});
}
