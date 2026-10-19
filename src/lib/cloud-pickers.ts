import {
	PUBLIC_DROPBOX_CLIENT_ID,
	PUBLIC_GOOGLE_CLIENT_ID,
	PUBLIC_GOOGLE_KEY
} from '$app/env/public';
import { resolve } from '$app/paths';
import type { RemoteMediaSource } from '#lib/store.svelte.js';
// In order to stay cross-origin isolated, we use broadacst channels and non-isolated popups

export type CloudProvider = 'google' | 'dropbox';

export const googleAllowed = !!PUBLIC_GOOGLE_CLIENT_ID && !!PUBLIC_GOOGLE_KEY;
export const dropboxAllowed = !!PUBLIC_DROPBOX_CLIENT_ID;

const CHANNEL_NAME = 'catcut-picker';

type PickerMessage = { id: string; sources: RemoteMediaSource[] };

let activeChannel: BroadcastChannel | undefined;

export function openCloudPicker(
	provider: CloudProvider,
	onpick: (sources: RemoteMediaSource[]) => void
) {
	activeChannel?.close();
	const id = crypto.randomUUID();
	const channel = new BroadcastChannel(CHANNEL_NAME);
	activeChannel = channel;
	channel.onmessage = (event: MessageEvent<PickerMessage>) => {
		if (event.data?.id !== id) return;
		channel.close();
		if (activeChannel === channel) activeChannel = undefined;
		onpick(event.data.sources);
	};

	const width = Math.min(1080, screen.availWidth);
	const height = Math.min(720, screen.availHeight);
	const left = Math.max(0, (screen.availWidth - width) / 2);
	const top = Math.max(0, (screen.availHeight - height) / 2);
	const url = new URL(resolve(`/pick/${provider}`), location.origin);
	url.searchParams.set('id', id);
	window.open(
		url,
		'catcut-picker',
		`popup,width=${width},height=${height},left=${left},top=${top}`
	);
}

export function sendPickedSources(id: string, sources: RemoteMediaSource[]) {
	const channel = new BroadcastChannel(CHANNEL_NAME);
	channel.postMessage({ id, sources } satisfies PickerMessage);
	channel.close();
}

export function loadScript(src: string, attributes: Record<string, string> = {}) {
	const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
	if (existing?.dataset.loaded) return Promise.resolve();

	return new Promise<void>((resolve, reject) => {
		const script = existing ?? document.createElement('script');
		script.addEventListener('load', () => {
			script.dataset.loaded = 'true';
			resolve();
		});
		script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
		if (existing) return;
		script.src = src;
		script.async = true;
		for (const [name, value] of Object.entries(attributes)) script.setAttribute(name, value);
		document.head.append(script);
	});
}

export const PICKER_MIME_TYPES = [
	'video/mp4',
	'video/webm',
	'video/quicktime',
	'video/x-matroska',
	'video/mpeg',
	'video/mp2t',
	'video/ogg',
	'audio/mpeg',
	'audio/mp4',
	'audio/x-m4a',
	'audio/aac',
	'audio/wav',
	'audio/x-wav',
	'audio/flac',
	'audio/x-flac',
	'audio/ogg',
	'audio/opus',
	'audio/webm'
];
