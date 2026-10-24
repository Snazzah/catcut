<script lang="ts">
	import Icon, { type IconifyIcon } from '@iconify/svelte';

	let {
		icon,
		label,
		href
	}: {
		icon: IconifyIcon;
		label: string;
		href: string;
	} = $props();
</script>

{undefined/* eslint-disable-next-line svelte/no-navigation-without-resolve */}
<a {href} target={href.startsWith('/') ? undefined : '_blank'} class="flex p-2 gap-2 rounded-md my-2 bg-violet-500/25 items-center text-lg">
	<Icon {icon} class="size-8 rounded" />
	<span class="text-white">{label}</span>
</a>
