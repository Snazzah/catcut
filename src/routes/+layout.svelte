<script lang="ts">
	import { env } from '$env/dynamic/public';
	import '../app.css';
	import { onMount, type Snippet } from 'svelte';
	import { Tooltip } from 'bits-ui';
	import { isDiscordActivity, initDiscordActivity } from '$lib/discord';
	import { Toaster, toast } from 'svelte-sonner';

	let { children }: { children: Snippet } = $props();

	onMount(() => {
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

		async function watchForServiceWorkerUpdate() {
			const registration = await navigator.serviceWorker.getRegistration();
			if (!registration) return;

			showUpdateToast(registration);
			registration.addEventListener('updatefound', () => {
				registration.installing?.addEventListener('statechange', () =>
					showUpdateToast(registration)
				);
			});
			navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
		}

		if ('serviceWorker' in navigator) {
			if (document.readyState === 'complete') {
				void watchForServiceWorkerUpdate();
			} else {
				window.addEventListener('load', () => void watchForServiceWorkerUpdate(), { once: true });
			}
		}

		if (isDiscordActivity()) {
			initDiscordActivity().catch((err) => console.error('Discord activity init failed', err));
		}
	});
</script>

<svelte:head>
	{#if env.PUBLIC_PLAUSIBLE_HOSTNAME}
		<script
			data-domain="catcut.snaz.in"
			src="https://{env.PUBLIC_PLAUSIBLE_HOSTNAME}/js/script.pageview-props.tagged-events.js"
		></script>
	{/if}
</svelte:head>

<div class="min-h-svh min-w-80 font-sans text-neutral-400 scheme-dark">
	<div
		class="fixed top-0 right-0 left-0 -z-1 h-svh bg-linear-to-b from-transparent via-violet-300/2 to-violet-500/5"
	></div>
	<Tooltip.Provider>
		{@render children()}
	</Tooltip.Provider>
	<Toaster richColors theme="dark" position="bottom-right" />
</div>
