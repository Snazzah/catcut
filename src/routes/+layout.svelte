<script lang="ts">
	import { page, updated } from '$app/state';
	import { PUBLIC_PLAUSIBLE_HOSTNAME } from '$app/env/public';
	import '../app.css';
	import { onMount, type Snippet } from 'svelte';
	import { Tooltip } from 'bits-ui';
	import { activity, isDiscordActivity, initDiscord } from '#lib/discord/index.svelte.js';
	import Header from '#lib/components/Header.svelte';
	import { queue } from '#lib/store.svelte.js';
	import { Toaster, toast } from 'svelte-sonner';
	import { dev } from '$app/env';
	import { resolve } from '$app/paths';
	import { OverlayScrollbars } from 'overlayscrollbars';
	import 'overlayscrollbars/overlayscrollbars.css';

	let { children }: { children: Snippet } = $props();
	let showHeader = $derived(
		page.url.pathname !== resolve('/') ||
			(!queue.active && activity.layoutMode !== 1 && activity.layoutMode !== 2)
	);

	onMount(() => {
		const scrollbars = OverlayScrollbars(document.body, {
			scrollbars: {
				theme: 'os-theme-light',
				autoHide: 'scroll',
				autoHideDelay: 500
			}
		});

		return () => scrollbars.destroy();
	});

	$effect(() => {
		if (dev || isDiscordActivity() || !updated.current || !('serviceWorker' in navigator)) return;

		navigator.serviceWorker.ready
			.then((registration) => registration.update())
			.catch((err) => console.warn('Service worker update check failed', err));
	});

	onMount(() => {
		let disposed = false;
		const listeners = new AbortController();
		const { signal } = listeners;
		updated.check();

		function showUpdateToast(registration: ServiceWorkerRegistration) {
			if (!registration.waiting || !navigator.serviceWorker.controller) return;

			toast('An update is ready.', {
				description: 'Reload when you are ready to use the latest version.',
				duration: Infinity,
				action: {
					label: 'Reload',
					onClick: () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
				}
			});
		}

		function watchForServiceWorkerUpdate(registration: ServiceWorkerRegistration) {
			if (disposed) return;

			showUpdateToast(registration);
			function watchInstallingWorker() {
				registration.installing?.addEventListener(
					'statechange',
					() => showUpdateToast(registration),
					{ signal }
				);
			}
			watchInstallingWorker();
			registration.addEventListener('updatefound', watchInstallingWorker, { signal });
		}

		if ('serviceWorker' in navigator && !dev && !isDiscordActivity()) {
			let hasController = !!navigator.serviceWorker.controller;
			navigator.serviceWorker.addEventListener(
				'controllerchange',
				() => {
					if (hasController) window.location.reload();
					else hasController = true;
				},
				{ signal }
			);

			async function registerServiceWorker() {
				try {
					const scriptUrl = new URL(`${resolve('')}service-worker.js`, window.location.origin);
					const policy = window.trustedTypes?.createPolicy('sveltekit-trusted-url', {
						createScriptURL: (url: string) => {
							if (url !== scriptUrl.href) throw new TypeError('Unexpected service worker URL');
							return url;
						}
					});
					const sanitised =
						(policy?.createScriptURL(scriptUrl.href) as unknown as URL) ?? scriptUrl;
					const registration = await navigator.serviceWorker.register(sanitised, {
						type: 'module'
					});
					watchForServiceWorkerUpdate(registration);
				} catch (err) {
					console.warn('Service worker registration failed', err);
				}
			}

			if (document.readyState === 'complete') registerServiceWorker();
			else window.addEventListener('load', () => registerServiceWorker(), { once: true, signal });
		}

		if (isDiscordActivity()) initDiscord();

		return () => {
			disposed = true;
			listeners.abort();
		};
	});
</script>

<svelte:head>
	{#if PUBLIC_PLAUSIBLE_HOSTNAME}
		<script
			data-domain="catcut.snaz.in"
			src="https://{PUBLIC_PLAUSIBLE_HOSTNAME}/js/script.pageview-props.tagged-events.js"
		></script>
	{/if}
</svelte:head>

<div class="min-h-svh min-w-80 font-sans text-neutral-400 scheme-dark">
	<div
		class="fixed top-0 right-0 left-0 -z-1 h-svh bg-linear-to-b from-transparent via-violet-300/2 to-violet-500/5"
	></div>
	<Tooltip.Provider>
		{#if showHeader}
			<Header />
		{/if}
		{@render children()}
	</Tooltip.Provider>
	<Toaster richColors closeButton theme="dark" position="bottom-right" />
</div>
