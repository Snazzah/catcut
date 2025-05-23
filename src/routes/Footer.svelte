<script lang="ts">
	import Icon from '@iconify/svelte';
	import githubIcon from '@iconify-icons/mdi/github';
	import privacyIcon from '@iconify-icons/mdi/lock';
	import donateIcon from '@iconify-icons/mdi/cards-heart';
	import twitterIcon from '@iconify-icons/mdi/twitter';
	import trashIcon from '@iconify-icons/mdi/trash';
	import Modal from './Modal.svelte';
	import { analyticsOptOut, googleDriveData } from '$lib/data';
	import CheckBoxButton from '$lib/components/CheckBoxButton.svelte';
	import { installEvent } from '$lib/install';
	import { catcut } from '$lib/icons';

	let aboutModalOpen = false;
	let settingsModalOpen = false;

	const dtf = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'long' });
</script>

<footer class="fixed bottom-0 left-0 right-0 text-center justify-center py-4 flex flex-col gap-2">
	<div class="flex gap-2 justify-center">
		{#if $installEvent}
			<button
				on:click={async () => {
					if (!$installEvent) return;
					$installEvent.prompt();
					const result = await $installEvent.userChoice;
					if (result.outcome === 'accepted') installEvent.set(null);
				}}
				class="rounded-md bg-violet-700 text-neutral-100 px-6 py-2 transition-all border border-violet-600 hover:bg-violet-600 hover:border-violet-500 hover:text-white active:scale-95"
			>
				install
			</button>
		{/if}
		<button
			on:click={() => (aboutModalOpen = true)}
			class="rounded-md bg-neutral-700 text-neutral-100 px-6 py-2 transition-all border border-neutral-600 hover:bg-neutral-600 hover:border-neutral-500 hover:text-white active:scale-95"
		>
			about
		</button>
		<button
			on:click={() => (settingsModalOpen = true)}
			class="rounded-md bg-neutral-700 text-neutral-100 px-6 py-2 transition-all border border-neutral-600 hover:bg-neutral-600 hover:border-neutral-500 hover:text-white active:scale-95"
		>
			settings
		</button>
	</div>
</footer>

<Modal open={aboutModalOpen} on:clickout={() => (aboutModalOpen = false)}>
	<div class="flex flex-col gap-4 m-2">
		<p>
			<b class="text-violet-500">
				<Icon icon={catcut} class="inline-block" inline />
				catcut
			</b>
			is a web app that uses
			<a
				href="https://ffmpegwasm.netlify.app/"
				target="_blank"
				class="text-violet-300 hover:text-violet-400 transition-colors"
			>
				ffmpeg.wasm
			</a>
			to trim and edit media without uploading your media to a server, with media only being processed
			in browser.
		</p>
		<div class="flex flex-col gap-2 text-white">
			<a
				href="https://github.com/Snazzah/catcut"
				target="_blank"
				class="px-4 py-2 rounded transition-colors bg-violet-600 hover:bg-violet-500 flex gap-2 items-center w-full"
			>
				<Icon icon={githubIcon} class="w-6 h-6" />
				<span>View on GitHub</span>
			</a>
			<a
				href="/privacy"
				class="px-4 py-2 rounded transition-colors bg-violet-600 hover:bg-violet-500 flex gap-2 items-center w-full"
			>
				<Icon icon={privacyIcon} class="w-6 h-6" />
				<span>Privacy Policy</span>
			</a>
		</div>
		<div class="flex text-center gap-2 justify-center items-center">
			<span>
				Made by
				<a
					href="https://snazzah.com/"
					target="_blank"
					class="text-violet-300 hover:text-violet-400 transition-colors"
				>
					Snazzah
				</a>
			</span>
			<a
				href="https://x.com/Snazzah"
				target="_blank"
				class="transition-colors text-violet-300 hover:text-violet-400 w-4 h-4"
			>
				<Icon icon={twitterIcon} class="w-4 h-4" />
			</a>
			<span>—</span>
			<a
				href="https://ko-fi.com/Snazzah"
				target="_blank"
				class="transition-colors text-red-500 hover:text-red-400 inline-flex gap-1 items-center"
			>
				<Icon icon={donateIcon} class="w-4 h-4" />
				<span>Donate</span>
			</a>
		</div>
	</div>
</Modal>

<Modal open={settingsModalOpen} on:clickout={() => (settingsModalOpen = false)}>
	<div class="flex flex-col gap-4 m-2">
		<div class="flex flex-col gap-2 text-white">
			<CheckBoxButton
				checked={$analyticsOptOut}
				on:click={() => ($analyticsOptOut = !$analyticsOptOut)}
			>
				Opt-out of anonymous analytics
			</CheckBoxButton>
			<p>
				this is used for traffic analytics and does not store data to track you, you can check the <a
					href="/privacy"
					class="text-violet-300 hover:text-violet-400 transition-colors">privacy policy</a
				> for more info.
			</p>
		</div>
		<div class="flex flex-col gap-2 text-white">
			<button
				class="px-4 py-2 rounded transition-colors bg-violet-600 enabled:hover:bg-violet-500 flex gap-2 items-center w-full disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed"
				disabled={$googleDriveData === null}
				on:click={() => googleDriveData.set(null)}
			>
				<Icon icon={trashIcon} class="w-6 h-6 transition-all hover:text-white" />
				<span>Clear Google Auth Data</span>
			</button>
			{#if $googleDriveData}
				<small class="text-neutral-300">Created {dtf.format($googleDriveData.created)}</small>
			{/if}
		</div>
	</div>
</Modal>
