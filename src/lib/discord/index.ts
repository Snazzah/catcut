import { PUBLIC_DISCORD_CLIENT_ID } from '$app/env/public';
import { browser } from '$app/env';

export function isDiscordActivity() {
	return browser && window.location.host.endsWith('.discordsays.com');
}

let sdk: import('@discord/embedded-app-sdk').DiscordSDK | undefined;
let initPromise: Promise<unknown> | undefined;

export function getDiscordSdk() {
	return sdk;
}

export async function initDiscordActivity() {
	if (!isDiscordActivity() || sdk || initPromise) return;
	initPromise = (async () => {
		const { DiscordSDK } = await import('@discord/embedded-app-sdk');
		sdk = new DiscordSDK(PUBLIC_DISCORD_CLIENT_ID!);
		await sdk.ready();
	})();
	await initPromise;
}
