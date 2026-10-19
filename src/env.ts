import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_PLAUSIBLE_HOSTNAME: { public: true, schema: (input) => input ?? '' },
	PUBLIC_DISCORD_CLIENT_ID: { public: true, schema: (input) => input ?? '' },
	PUBLIC_DROPBOX_CLIENT_ID: { public: true, schema: (input) => input ?? '' },
	PUBLIC_GOOGLE_KEY: { public: true, schema: (input) => input ?? '' },
	PUBLIC_GOOGLE_CLIENT_ID: { public: true, schema: (input) => input ?? '' }
});
