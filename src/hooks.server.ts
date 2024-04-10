import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	if (event.route.id === '/dropbox' || event.route.id === '/googledrive') response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
	else response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');

	if (event.route.id === '/googledrive') response.headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
	else response.headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
	return response;
};
