import { writable } from '@macfja/svelte-persistent-store';
import type { GoogleTokenResponse } from './google';

export const ffmpegMultithreaded = writable<boolean>('catcut-ffmpeg-mt', false);
export const googleDriveData = writable<GoogleTokenResponse & { created: number } | null>('catcut-google-drive-auth', null);
