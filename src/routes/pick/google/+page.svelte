<script lang="ts">
	import driveIcon from '@iconify-icons/mdi/google-drive';
	import { onMount } from 'svelte';
	import { PUBLIC_GOOGLE_CLIENT_ID, PUBLIC_GOOGLE_KEY } from '$app/env/public';
	import {
		GOOGLE_TOKEN_KEY,
		googleAllowed,
		loadScript,
		PICKER_MIME_TYPES,
		sendPickedSources
	} from '#lib/cloud-pickers.js';
	import PickerStatus from '../PickerStatus.svelte';

	type StoredToken = { accessToken: string; expiresAt: number };

	const SCOPE = 'https://www.googleapis.com/auth/drive.file';
	const APP_ID = PUBLIC_GOOGLE_CLIENT_ID.split('-')[0];

	let id = $state<string | null>();
	let ready = $state(false);
	let picking = $state(false);
	let error = $state<string | null>(null);
	let tokenClient: ReturnType<
		NonNullable<Window['google']>['accounts']['oauth2']['initTokenClient']
	>;

	function getStoredToken() {
		try {
			const token: StoredToken = JSON.parse(localStorage.getItem(GOOGLE_TOKEN_KEY) ?? 'null');
			if (token && token.expiresAt - 10 * 60_000 > Date.now()) return token.accessToken;
		} catch {}
		return null;
	}

	function showPicker(accessToken: string) {
		const { picker } = window.google!;
		const view = new picker.DocsView(picker.ViewId.DOCS);
		view.setMimeTypes(PICKER_MIME_TYPES.join(','));
		view.setIncludeFolders(true);

		picking = true;
		new picker.PickerBuilder()
			.addView(view)
			.enableFeature(picker.Feature.MULTISELECT_ENABLED)
			.setOAuthToken(accessToken)
			.setDeveloperKey(PUBLIC_GOOGLE_KEY)
			.setAppId(APP_ID)
			.setCallback(({ action, docs }) => {
				if (action === picker.Action.CANCEL) {
					picking = false;
					window.close();
				} else if (action === picker.Action.PICKED && docs?.length) {
					sendPickedSources(
						id!,
						docs.map((doc) => ({
							origin: 'remote',
							url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(doc.id)}?alt=media`,
							name: doc.name,
							size: doc.sizeBytes,
							headers: { Authorization: `Bearer ${accessToken}` }
						}))
					);
					window.close();
				}
			})
			.build()
			.setVisible(true);
	}

	function signIn() {
		error = null;
		tokenClient.requestAccessToken({ prompt: '' });
	}

	function pick() {
		const token = getStoredToken();
		if (token) showPicker(token);
		else signIn();
	}

	onMount(() => {
		id = new URL(location.href).searchParams.get('id');
		if (!id || !googleAllowed) return;

		Promise.all([
			loadScript('https://accounts.google.com/gsi/client'),
			loadScript('https://apis.google.com/js/api.js').then(
				() => new Promise<void>((resolve) => window.gapi!.load('picker', resolve))
			)
		])
			.then(() => {
				tokenClient = window.google!.accounts.oauth2.initTokenClient({
					client_id: PUBLIC_GOOGLE_CLIENT_ID,
					scope: SCOPE,
					callback(response) {
						if (response.error) {
							error = `Google sign-in failed: ${response.error}`;
							return;
						}
						localStorage.setItem(
							GOOGLE_TOKEN_KEY,
							JSON.stringify({
								accessToken: response.access_token,
								expiresAt: Date.now() + response.expires_in * 1000
							} satisfies StoredToken)
						);
						showPicker(response.access_token);
					},
					error_callback(err) {
						if (err.type !== 'popup_closed') error = err.message ?? 'Google sign-in failed.';
					}
				});
				ready = true;

				if (getStoredToken()) pick();
			})
			.catch(() => (error = 'Could not load Google Drive. Check your connection or ad blocker.'));
	});
</script>

<svelte:head>
	<title>Google Drive - catcut</title>
</svelte:head>

{#if !googleAllowed}
	<PickerStatus icon={driveIcon} title="Google Drive" message="Google Drive is not set up." error />
{:else if id === null}
	<PickerStatus
		icon={driveIcon}
		title="Google Drive"
		message="Open this from the catcut home page."
		error
	/>
{:else if error}
	<PickerStatus icon={driveIcon} title="Google Drive" message={error} error>
		{#if ready}
			<button
				class="cursor-pointer rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-[background-color,scale] hover:bg-violet-500 active:scale-95"
				onclick={signIn}>Try again</button
			>
		{/if}
	</PickerStatus>
{:else if !ready}
	<PickerStatus icon={driveIcon} title="Google Drive" message="Loading Google Drive..." />
{:else}
	<PickerStatus
		icon={driveIcon}
		title="Google Drive"
		message={picking
			? 'Choose your files in the picker.'
			: 'Sign in to pick files from your Drive.'}
	>
		<button
			class="cursor-pointer rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-[background-color,scale] hover:bg-violet-500 active:scale-95"
			onclick={pick}>{picking ? 'Reopen picker' : 'Continue with Google'}</button
		>
	</PickerStatus>
{/if}
