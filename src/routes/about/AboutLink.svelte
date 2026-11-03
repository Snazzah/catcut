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

{undefined}
<a
	{href}
	target={external ? '_blank' : undefined}
	class="my-2 flex items-center gap-3 rounded-lg bg-neutral-800 p-3 text-lg transition-[background-color,scale] outline-none hover:bg-neutral-700 hover:!no-underline focus-visible:ring-2 focus-visible:ring-violet-200 active:scale-[0.98]"
>
	<Icon {icon} class="size-8 shrink-0 text-violet-400" />
	<span class="text-white">{label}</span>
	<Icon
		icon={external ? externalIcon : chevronIcon}
		class="ml-auto size-6 shrink-0 text-neutral-500"
	/>
</a>
