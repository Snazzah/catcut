<script lang="ts">
	import Icon from '@iconify/svelte';
	import fileOutlineIcon from '@iconify-icons/mdi/file-outline';
	import fileVideoIcon from '@iconify-icons/mdi/file-video';
	import fileMusicIcon from '@iconify-icons/mdi/file-music';
	import type { EditorSession } from '../editor-session.svelte';

	let { session }: { session: EditorSession } = $props();
	let options = $derived([
		{ id: null, label: 'Original', icon: fileOutlineIcon },
		...session.availableFormats.map((format) => ({
			id: format.id,
			label: format.label,
			icon: format.create().getSupportedVideoCodecs().length > 0 ? fileVideoIcon : fileMusicIcon
		}))
	]);
</script>

<div
	class="flex h-full w-max min-w-full items-center gap-1.5 sm:gap-2"
	role="tabpanel"
	aria-label="Format settings"
>
	{#each options as option (option.id)}
		<button
			type="button"
			aria-pressed={session.outputFormat === option.id}
			class={[
				'flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-violet-200',
				session.outputFormat === option.id
					? 'bg-violet-500 text-white'
					: 'bg-neutral-900 text-neutral-200 hover:bg-white/8 hover:text-white'
			]}
			disabled={session.saving}
			onclick={() => session.updateFormat(option.id)}
		>
			<Icon icon={option.icon} class="size-4.5" aria-hidden="true" />
			{option.label}
		</button>
	{/each}
</div>
