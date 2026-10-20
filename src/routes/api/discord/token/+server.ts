import { error, json } from '@sveltejs/kit';
import { PUBLIC_DISCORD_CLIENT_ID } from '$app/env/public';
import { DISCORD_CLIENT_SECRET } from '$app/env/private';
import type { RequestHandler } from './$types';

export const prerender = false;

export const POST: RequestHandler = async ({ request, fetch }) => {
	if (!PUBLIC_DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET)
		error(503, 'Discord login is not configured');
	const { code } = await request.json().catch(() => ({}));
	if (typeof code !== 'string' || !code) error(400, 'Missing authorization code');

	const response = await fetch('https://discord.com/api/oauth2/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: PUBLIC_DISCORD_CLIENT_ID,
			client_secret: DISCORD_CLIENT_SECRET,
			grant_type: 'authorization_code',
			code
		})
	});
	if (!response.ok) error(502, `Discord token exchange failed (${response.status})`);
	const { access_token } = await response.json();
	return json({ access_token });
};
