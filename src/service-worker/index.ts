/// <reference lib="webworker" />

import { version } from '$app/env';
import { self } from '$app/service-worker';
import { immutable, assets, prerendered } from '$app/manifest';
import { asset, resolve } from '$app/paths';

const CACHE_NAME = `catcut-${version}`;
const SHARED_MEDIA_CACHE_NAME = 'catcut-shared-media';
const appShell = [
	...immutable.map(({ path }) => new URL(path, self.registration.scope).pathname),
	...prerendered.map(({ path }) => resolve(path))
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then(async (cache) => {
			await cache.addAll(appShell);
			await Promise.all(assets.map(({ path }) => cache.add(asset(path)).catch(() => undefined)));
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
	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return Response.redirect(new URL('/?share-error=parse', self.location.origin), 303);
	}
	const file = form.getAll('media').find((value): value is File => value instanceof File);
	if (!file) return Response.redirect(new URL('/?share-error=missing', self.location.origin), 303);
	if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
		const errorUrl = new URL('/?share-error=type', self.location.origin);
		errorUrl.searchParams.set('mime', file.type);
		return Response.redirect(errorUrl, 303);
	}

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

	// Don't cache this to let svelte version-check itself
	if (url.pathname === '/_app/version.json') return;

	event.respondWith(
		caches.open(CACHE_NAME).then(async (cache) => {
			if (event.request.mode === 'navigate') {
				const cached = await cache.match(url.pathname);
				if (cached) return cached;

				try {
					return await fetch(event.request);
				} catch (err) {
					const shell = await cache.match('/');
					if (shell) return shell;
					throw err;
				}
			}

			return (await cache.match(event.request)) ?? fetch(event.request);
		})
	);
});
