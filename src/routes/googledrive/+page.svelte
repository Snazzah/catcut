<script lang="ts">
	import Icon from "@iconify/svelte";
	import driveIcon from "@iconify-icons/mdi/google-drive";
	import { PUBLIC_GOOGLE_CLIENT_ID, PUBLIC_GOOGLE_KEY } from "$env/static/public";
	import { ALLOWED_TYPES } from "$lib/util";
	import { googleDriveData } from "$lib/data";
	import type { GoogleTokenResponse } from "$lib/google";

	let tokenClient: any;
	let gisInited = false;
	let pickerInited = false;
	let redirecting = false;
	const isolated = window.crossOriginIsolated;

	function gisLoaded() {
		tokenClient = window.google.accounts.oauth2.initTokenClient({
			client_id: PUBLIC_GOOGLE_CLIENT_ID,
			scope: 'https://www.googleapis.com/auth/drive.readonly',
			callback: ''
		});
		gisInited = true;
	}

	function createPicker() {
		const showPicker = () => {
			const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
			view.setMimeTypes(ALLOWED_TYPES.join(','));
			const picker = new window.google.picker.PickerBuilder()
					.addView(view)
					.setOAuthToken($googleDriveData!.access_token)
					.setDeveloperKey(PUBLIC_GOOGLE_KEY)
					.setCallback(pickerCallback)
					.build();
			picker.setVisible(true);
		}

		// Request an access token.
		tokenClient.callback = async (response: GoogleTokenResponse & { error: any }) => {
			console.log({ response });
			if (response.error !== undefined) return console.error('Callback error', response.error);
			$googleDriveData = { ...response, created: Date.now() };
			showPicker();
		};

		tokenClient.error_callback = (error: any) => {
			console.log('Token client error', error.message, { error });
		};

		tokenClient.requestAccessToken({ prompt: !$googleDriveData ? 'consent' : '' });
	}

	// A simple callback implementation.
	async function pickerCallback({ action, docs }: { action: 'loaded' | 'picked' | 'cancel', docs: any[] }) {
		console.log({ action, docs });
		if (action === 'loaded') return;
		if (action === 'cancel') return;

		const fileId: string = docs[0]?.id;
		if (!fileId) return;

		redirecting = true;
		location.href = `/?${new URLSearchParams({
			'googledrivefile': fileId
		}).toString()}`;
	}
</script>

<svelte:head>
	<script
		async defer
		src="https://apis.google.com/js/api.js"
		on:load={() => window.gapi.load('client:picker', async () => {
			await window.gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
			pickerInited = true;
		})}
	/>
	<script async defer src="https://accounts.google.com/gsi/client" on:load={gisLoaded} />
</svelte:head>



<main class="flex flex-col items-center justify-center min-h-screen overflow-hidden" data-sveltekit-reload>
	<Icon icon={driveIcon} class="w-48 h-48" />
	{#if isolated}
		<span class="text-red-400">Cannot use the Google Drive picker in a cross-origin isolated context.</span>
	{:else if !pickerInited ||  !gisInited}
		<span>Loading Google Drive picker...</span>
	{:else if redirecting}
		<span>Redirecting you back to the app...</span>
	{:else}
		<button on:click={createPicker} class="rounded-md px-4 py-2 transition-all bg-violet-700 text-white hover:bg-violet-600 active:scale-95">
			Pick a File
		</button>
		<a href="/" class="hover:underline text-sm mt-4">back</a>
	{/if}
</main>
