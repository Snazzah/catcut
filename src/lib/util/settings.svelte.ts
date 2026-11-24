import { browser } from '$app/env';
import type { AudioCodec, VideoCodec } from 'mediabunny';

const STORAGE_KEY = 'catcut-settings';

export const VIDEO_CODEC_PREFERENCES = [
	{ value: 'auto', label: 'Auto' },
	{ value: 'avc', label: 'H.264 (AVC)' },
	{ value: 'hevc', label: 'H.265 (HEVC)' },
	{ value: 'vp9', label: 'VP9' },
	{ value: 'av1', label: 'AV1' }
] as const satisfies readonly Readonly<{ value: 'auto' | VideoCodec; label: string }>[];

export const AUDIO_CODEC_PREFERENCES = [
	{ value: 'auto', label: 'Auto' },
	{ value: 'aac', label: 'AAC' },
	{ value: 'opus', label: 'Opus' },
	{ value: 'mp3', label: 'MP3' },
	{ value: 'flac', label: 'FLAC' }
] as const satisfies readonly Readonly<{ value: 'auto' | AudioCodec; label: string }>[];

export type VideoCodecPreference = (typeof VIDEO_CODEC_PREFERENCES)[number]['value'];
export type AudioCodecPreference = (typeof AUDIO_CODEC_PREFERENCES)[number]['value'];

export type Settings = {
	analytics: boolean;
	startWithEditor: boolean;
	askAboutEditor: boolean;
	v2NoticeDismissed: boolean;
	videoCodec: VideoCodecPreference;
	audioCodec: AudioCodecPreference;
};

const defaults: Settings = {
	analytics: true,
	startWithEditor: false,
	askAboutEditor: false,
	v2NoticeDismissed: false,
	videoCodec: 'auto',
	audioCodec: 'auto'
};

// Settings limited to a fixed set of values
const choices: Partial<Record<keyof Settings, readonly unknown[]>> = {
	videoCodec: VIDEO_CODEC_PREFERENCES.map(({ value }) => value),
	audioCodec: AUDIO_CODEC_PREFERENCES.map(({ value }) => value)
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
			if (!(key in parsed) || typeof parsed[key] !== typeof defaults[key]) continue;
			if (choices[key] && !choices[key].includes(parsed[key])) continue;
			(result as Record<keyof Settings, unknown>)[key] = parsed[key];
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
