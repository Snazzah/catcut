import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			// Consult https://kit.svelte.dev/docs/integrations#preprocessors
			// for more information about preprocessors
			preprocess: vitePreprocess(),
			adapter: adapter(),
			version: { pollInterval: 60000 },
			serviceWorker: { register: false }
		})
	],
	resolve: { dedupe: ['mediabunny'] },
	server: { allowedHosts: ['.trycloudflare.com'] }
});
