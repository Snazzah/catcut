<script lang="ts">
	import closeIcon from '@iconify-icons/mdi/close';
	import openInNewIcon from '@iconify-icons/mdi/open-in-new';
	import Icon from '@iconify/svelte';

	let {
		text,
		href,
		cta = 'view update',
		onclose
	}: { text: string; href: string; cta?: string; onclose: () => void } = $props();
</script>

<div
	class="group relative mt-2 flex max-w-full items-center gap-2 rounded-2xl border border-violet-500/40 bg-violet-500/15 py-1.5 pr-2 pl-4 text-sm font-medium text-violet-200 transition-colors has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-violet-500/35 has-[a:hover]:bg-violet-500/25 has-[a:hover]:text-white sm:gap-1 sm:rounded-full sm:py-1"
>
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a
		{href}
		target="_blank"
		rel="noopener noreferrer"
		class="flex flex-col outline-none after:absolute after:inset-0 after:rounded-2xl sm:flex-row sm:items-center sm:gap-1.5 sm:after:rounded-full"
	>
		{text}
		<span
			class="flex items-center gap-1 font-semibold text-violet-400 transition-colors group-has-[a:hover]:text-violet-300"
		>
			{cta}
			<Icon icon={openInNewIcon} class="size-3.5" />
		</span>
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
	<button
		class="relative flex size-6 cursor-pointer items-center justify-center rounded-full text-violet-300 transition-colors hover:bg-violet-500/25 hover:text-white active:scale-95"
		aria-label="Dismiss"
		title="Dismiss"
		onclick={onclose}
	>
		<Icon icon={closeIcon} class="size-4" />
	</button>
</div>
