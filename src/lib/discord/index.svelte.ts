import { PUBLIC_DISCORD_CLIENT_ID } from '$app/env/public';
import { browser } from '$app/env';
import type { DiscordSDK, EventPayloadData } from '@discord/embedded-app-sdk';

export function isDiscordActivity() {
	return browser && window.location.host.endsWith('.discordsays.com');
}

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

class DiscordActivity {
	#layoutMode = $state<LayoutUpdate['layout_mode'] | null>(null);
	#orientation = $state<OrientationUpdate['screen_orientation'] | null>(null);
	#authorization = $state.raw<Authorization | null>(null);
	#authorizing: Promise<Authorization> | null = null;

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

	async authorize() {
		if (this.#authorization) return this.#authorization;
		this.#authorizing ??= this.#authorize().finally(() => (this.#authorizing = null));
		return this.#authorizing;
	}

	async #authorize() {
		await this.sdk.ready();
		const { code } = await this.sdk.commands.authorize({
			client_id: this.sdk.clientId,
			response_type: 'code',
			prompt: 'none',
			scope: ['identify']
		});
		const response = await fetch('/api/discord/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ code })
		});
		if (!response.ok) throw new Error(`Discord token exchange failed (${response.status})`);
		const { access_token }: { access_token?: string } = await response.json();
		if (!access_token) throw new Error('Discord token exchange returned an empty access token');
		const authorization = await this.sdk.commands.authenticate({ access_token });
		this.#authorization = authorization;
		return authorization;
	}

	async uploadFile(file: File) {
		const { access_token } = await this.authorize();
		const body = new FormData();
		body.append('file', file);
		const response = await fetch(
			`https://discord.com/api/applications/${this.sdk.clientId}/attachment`,
			{ method: 'POST', headers: { Authorization: `Bearer ${access_token}` }, body }
		);
		if (response.status === 401) this.#authorization = null;
		if (response.status === 413) throw new Error('This file is too large to upload to Discord.');
		if (!response.ok) throw new Error(`Discord upload failed (${response.status})`);
		const data: { attachment: { url: string } } = await response.json();
		return data.attachment.url;
	}

	async saveFile(file: File) {
		const url = await this.uploadFile(file);
		if (this.sdk.platform !== 'mobile') {
			try {
				await this.sdk.commands.openShareMomentDialog({ mediaUrl: url });
				return { url, opened: true };
			} catch (error) {
				console.warn('Share moment dialog failed, opening link instead', error);
			}
		}
		const { opened } = await this.sdk.commands.openExternalLink({ url });
		return { url, opened: opened !== false };
	}
}

export const activity = new DiscordActivity();
