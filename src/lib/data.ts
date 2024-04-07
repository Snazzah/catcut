import { writable } from '@macfja/svelte-persistent-store';

export const ffmpegMultithreaded = writable<boolean>('catcut-ffmpeg-mt', false);
