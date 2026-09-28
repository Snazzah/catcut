/// <reference lib="webworker" />

import { build, files, prerendered, version } from '$service-worker';

const CACHE_NAME = `catcut-${version}`;
const SHARED_MEDIA_CACHE_NAME = 'catcut-shared-media';
const appShell = [...build, ...prerendered];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then(async (cache) => {
			await cache.addAll(appShell);
			await Promise.all(files.map((asset) => cache.add(asset).catch(() => undefined)));
		})
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter(
							(key) =>
								key.startsWith('catcut-') && key !== CACHE_NAME && key !== SHARED_MEDIA_CACHE_NAME
						)
						.map((key) => caches.delete(key))
				)
			)
			.then(() => self.clients.claim())
	);
});

self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function receiveSharedMedia(request: Request): Promise<Response> {
	const form = await request.formData();
	const file = form
		.getAll('media')
		.find(
			(value): value is File =>
				value instanceof File &&
				(value.type.startsWith('video/') || value.type.startsWith('audio/'))
		);
	if (!file) return Response.redirect(new URL('/?share-error=invalid', self.location.origin), 303);

	const id = crypto.randomUUID();
	try {
		const cache = await caches.open(SHARED_MEDIA_CACHE_NAME);
		await cache.put(
			new URL(`/__shared-media/${id}`, self.location.origin),
			new Response(file, {
				headers: { 'X-File-Name': encodeURIComponent(file.name), 'Content-Type': file.type }
			})
		);
	} catch {
		return Response.redirect(new URL('/?share-error=storage', self.location.origin), 303);
	}
	return Response.redirect(new URL(`/?shared-media=${id}`, self.location.origin), 303);
}

self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	if (
		event.request.method === 'POST' &&
		url.origin === self.location.origin &&
		url.searchParams.has('share-target')
	) {
		// Handle shared media
		event.respondWith(receiveSharedMedia(event.request));
		return;
	}
	if (event.request.method !== 'GET') return;

	if (url.origin !== self.location.origin) return;

	event.respondWith(
		caches.open(CACHE_NAME).then(async (cache) => {
			if (event.request.mode === 'navigate') {
				return (
					(await cache.match(url.pathname)) ?? (await cache.match('/')) ?? fetch(event.request)
				);
			}

			return (await cache.match(event.request)) ?? fetch(event.request);
		})
	);
});
