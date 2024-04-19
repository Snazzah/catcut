<script>
	import Icon from '@iconify/svelte';
	import githubIcon from '@iconify-icons/mdi/github';
	import privacyIcon from '@iconify-icons/mdi/information-variant';
	import donateIcon from '@iconify-icons/mdi/cards-heart';
	import snazzahIcon from '@iconify-icons/mdi/cat';
	import trashIcon from '@iconify-icons/mdi/trash';
	import uncheckIcon from '@iconify-icons/mdi/checkbox-blank-outline';
	import checkIcon from '@iconify-icons/mdi/checkbox-marked';
	import Modal from './Modal.svelte';
	import { analyticsOptOut, googleDriveData } from '$lib/data';

	let aboutModalOpen = false;
	let settingsModalOpen = false;

	const dtf = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'long' });
</script>

<footer class="fixed bottom-0 left-0 right-0 text-center justify-center py-4 flex flex-col gap-2">
	<div class="flex gap-2 justify-center">
		<button
			on:click={() => (aboutModalOpen = true)}
			class="rounded-md bg-neutral-700 text-neutral-100 px-6 py-2 transition-all border border-neutral-600 hover:bg-neutral-600 hover:border-neutral-500 hover:text-white"
		>
			about
		</button>
		<button
			on:click={() => (settingsModalOpen = true)}
			class="rounded-md bg-neutral-700 text-neutral-100 px-6 py-2 transition-all border border-neutral-600 hover:bg-neutral-600 hover:border-neutral-500 hover:text-white"
		>
			settings
		</button>
	</div>
</footer>

<Modal open={aboutModalOpen} on:clickout={() => (aboutModalOpen = false)}>
	<div class="flex flex-col gap-4">
		<p>
			<b class="text-violet-500">catcut</b> is a web app that uses
			<a
				href="https://ffmpegwasm.netlify.app/"
				target="_blank"
				class="text-violet-300 hover:text-violet-400 transition-colors">ffmpeg.wasm</a
			>
			to trim and edit media without uploading your media to a server, with media only being processed
			in browser.
		</p>
		<div class="flex flex-col gap-2 text-white">
			<a
				href="https://github.com/Snazzah/catcut"
				target="_blank"
				class="px-4 py-2 rounded transition-colors bg-violet-600 hover:bg-violet-500 flex gap-2 items-center w-full"
			>
				<Icon icon={githubIcon} class="w-6 h-6 transition-all hover:text-white" />
				<span>View on GitHub</span>
			</a>
			<a
				href="/privacy"
				class="px-4 py-2 rounded transition-colors bg-violet-600 hover:bg-violet-500 flex gap-2 items-center w-full"
			>
				<Icon icon={privacyIcon} class="w-6 h-6 transition-all hover:text-white" />
				<span>Privacy Policy</span>
			</a>
			<a
				href="https://ko-fi.com/Snazzah"
				target="_blank"
				class="px-4 py-2 rounded transition-colors bg-violet-600 hover:bg-violet-500 flex gap-2 items-center w-full"
			>
				<Icon icon={donateIcon} class="w-6 h-6 transition-all hover:text-white" />
				<span>Donate</span>
			</a>
			<a
				href="https://snazzah.com"
				target="_blank"
				class="px-4 py-2 rounded transition-colors bg-violet-600 hover:bg-violet-500 flex gap-2 items-center w-full"
			>
				<Icon icon={snazzahIcon} class="w-6 h-6 transition-all hover:text-white" />
				<span>snazzah.com</span>
			</a>
		</div>
	</div>
</Modal>

<Modal open={settingsModalOpen} on:clickout={() => (settingsModalOpen = false)}>
	<div class="flex flex-col gap-4">
		<div class="flex flex-col gap-2 text-white">
			<button
				class="px-4 py-2 rounded transition-colors bg-violet-600 enabled:hover:bg-violet-500 flex gap-2 items-center w-full disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed"
				on:click={() => ($analyticsOptOut = !$analyticsOptOut)}
			>
				<Icon
					icon={$analyticsOptOut ? checkIcon : uncheckIcon}
					class="w-6 h-6 transition-all hover:text-white"
				/>
				<span>Opt-out of anonymous analytics</span>
			</button>
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
