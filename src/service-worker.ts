/// <reference lib="webworker" />

import { build, files, prerendered, version } from '$service-worker';

const cacheName = `catcut-${version}`;
const assets = [...build, ...files, ...prerendered];

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)))
			)
			.then(() => self.clients.claim())
	);
});

self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	if (url.origin !== self.location.origin) return;

	event.respondWith(
		caches.open(cacheName).then(async (cache) => {
			if (event.request.mode === 'navigate') {
				return (
					(await cache.match(url.pathname)) ?? (await cache.match('/')) ?? fetch(event.request)
				);
			}

			return (await cache.match(event.request)) ?? fetch(event.request);
		})
	);
});
