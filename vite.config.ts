import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import { execSync } from 'node:child_process';

function crossOriginIsolation(): Plugin {
	return {
		name: 'catcut:cross-origin-isolation',
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if (!req.url?.startsWith('/pick/')) {
					res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
					res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
				}
				next();
			});
		}
	};
}

function getCommitSha() {
	if (process.env.WORKERS_CI_COMMIT_SHA) return process.env.WORKERS_CI_COMMIT_SHA;
	try {
		return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
	} catch {
		return undefined;
	}
}

export default defineConfig({
	plugins: [
		crossOriginIsolation(),
		tailwindcss(),
		enhancedImages(),
		sveltekit({
			// Consult https://kit.svelte.dev/docs/integrations#preprocessors
			// for more information about preprocessors
			preprocess: [vitePreprocess(), mdsvex({ extensions: ['.svx', '.md'] })],
			adapter: adapter(),
			version: { name: getCommitSha(), pollInterval: 60000 },
			serviceWorker: { register: false },
			paths: { relative: false },
			extensions: ['.svelte', '.svx', '.md']
		})
	],
	resolve: { dedupe: ['mediabunny'] },
	server: { allowedHosts: ['.trycloudflare.com'] }
});
