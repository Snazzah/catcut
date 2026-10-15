import { PUBLIC_DISCORD_CLIENT_ID } from '$app/env/public';
import { browser } from '$app/env';
import type { DiscordSDK, EventPayloadData } from '@discord/embedded-app-sdk';

export function isDiscordActivity() {
	return browser && window.location.host.endsWith('.discordsays.com');
}

// TODO i need a small server for auth n stuff

let sdk: DiscordSDK | undefined;
let initPromise: Promise<DiscordActivity> | undefined;

export function getDiscordSdk() {
	return sdk;
}

export function getDiscordActivity() {
	return activity;
}

export async function initDiscord() {
	if (!isDiscordActivity()) return;
	initPromise ??= (async () => {
		if (!PUBLIC_DISCORD_CLIENT_ID) throw new Error('Missing public Discord client ID');
		const { DiscordSDK } = await import('@discord/embedded-app-sdk');
		const discordSdk = new DiscordSDK(PUBLIC_DISCORD_CLIENT_ID);
		await discordSdk.ready();
		sdk = discordSdk;
		await activity.start();
		return activity;
	})();
	try {
		return await initPromise;
	} catch (error) {
		initPromise = undefined;
		throw error;
	}
}

type LayoutUpdate = EventPayloadData<'ACTIVITY_LAYOUT_MODE_UPDATE'>;
type OrientationUpdate = EventPayloadData<'ORIENTATION_UPDATE'>;
type Authorization = Awaited<ReturnType<DiscordSDK['commands']['authenticate']>>;
type AuthorizeOptions = Parameters<DiscordSDK['commands']['authorize']>[0];

class DiscordActivity {
	#layoutMode = $state<LayoutUpdate['layout_mode'] | null>(null);
	#orientation = $state<OrientationUpdate['screen_orientation'] | null>(null);
	#authorization = $state.raw<Authorization | null>(null);

	get sdk() {
		if (!sdk) throw new Error('Discord Activity has not been initialized');
		return sdk;
	}

	get layoutMode() {
		return this.#layoutMode;
	}

	get orientation() {
		return this.#orientation;
	}

	get user() {
		return this.#authorization?.user ?? null;
	}

	#onLayout = (update: LayoutUpdate) => {
		this.#layoutMode = update.layout_mode;
	};

	#onOrientation = (update: OrientationUpdate) => {
		this.#orientation = update.screen_orientation;
	};

	async start() {
		await this.sdk.ready();
		return Promise.allSettled([
			this.sdk.subscribe('ACTIVITY_LAYOUT_MODE_UPDATE', this.#onLayout),
			this.sdk.subscribe('ORIENTATION_UPDATE', this.#onOrientation)
		]);
	}

	async stop() {
		return Promise.allSettled([
			this.sdk.unsubscribe('ACTIVITY_LAYOUT_MODE_UPDATE', this.#onLayout),
			this.sdk.unsubscribe('ORIENTATION_UPDATE', this.#onOrientation)
		]);
	}

	async authorizeUser({
		exchangeCode,
		scope = ['identify']
	}: {
		exchangeCode: (code: string) => Promise<string>;
		scope?: AuthorizeOptions['scope'];
	}) {
		await this.sdk.ready();
		const { code } = await this.sdk.commands.authorize({
			client_id: this.sdk.clientId,
			response_type: 'code',
			prompt: 'none',
			scope
		});
		const accessToken = await exchangeCode(code);
		if (!accessToken) throw new Error('Discord token exchange returned an empty access token');
		const authorization = await this.sdk.commands.authenticate({ access_token: accessToken });
		this.#authorization = authorization;
		return authorization.user;
	}

	async uploadFile(file: File) {
		if (!this.#authorization) throw new Error('Authorize the Discord user before uploading');
		const body = new FormData();
		body.append('file', file);
		const response = await fetch(
			`https://discord.com/api/applications/${this.sdk.clientId}/attachment`,
			{
				method: 'POST',
				headers: { Authorization: `Bearer ${this.#authorization.access_token}` },
				body
			}
		);
		if (!response.ok) throw new Error(`Discord upload failed (${response.status})`);
		const data: any = await response.json();
		return data.attachment.url;
	}

	async shareFile(file: File) {
		const mediaUrl = await this.uploadFile(file);
		await this.sdk.commands.openShareMomentDialog({ mediaUrl });
		return mediaUrl;
	}
}

export const activity = new DiscordActivity();
