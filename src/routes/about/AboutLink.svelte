<script lang="ts">
	import Icon, { type IconifyIcon } from '@iconify/svelte';
	import chevronIcon from '@iconify-icons/mdi/chevron-right';
	import externalIcon from '@iconify-icons/mdi/open-in-new';

	let {
		icon,
		label,
		href
	}: {
		icon: IconifyIcon;
		label: string;
		href: string;
	} = $props();

	let external = $derived(!href.startsWith('/'));
</script>

{undefined/* eslint-disable-next-line svelte/no-navigation-without-resolve */}
<a {href} target={external ? '_blank' : undefined} class="flex p-3 gap-3 rounded-lg my-2 bg-neutral-800 items-center text-lg transition-[background-color,scale] outline-none hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-violet-200 active:scale-[0.98] hover:!no-underline">
	<Icon {icon} class="size-8 shrink-0 text-violet-400" />
	<span class="text-white">{label}</span>
	<Icon icon={external ? externalIcon : chevronIcon} class="ml-auto size-6 shrink-0 text-neutral-500" />
</a>
