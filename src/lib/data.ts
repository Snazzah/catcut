import { writable } from '@macfja/svelte-persistent-store';
import type { GoogleTokenResponse } from './google';

export const googleDriveData = writable<(GoogleTokenResponse & { created: number }) | null>(
	'catcut-google-drive-auth',
	null
);
export const analyticsOptOut = writable<boolean>('plausible_ignore', false);
