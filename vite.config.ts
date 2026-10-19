import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		enhancedImages(),
		sveltekit({
			// Consult https://kit.svelte.dev/docs/integrations#preprocessors
			// for more information about preprocessors
			preprocess: [vitePreprocess(), mdsvex({ extensions: ['.svx', '.md'] })],
			adapter: adapter(),
			version: { pollInterval: 60000 },
			serviceWorker: { register: false },
			extensions: ['.svelte', '.svx', '.md']
		})
	],
	resolve: { dedupe: ['mediabunny'] },
	server: { allowedHosts: ['.trycloudflare.com'] }
});
