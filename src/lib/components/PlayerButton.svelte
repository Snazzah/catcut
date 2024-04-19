<script lang="ts">
	import type { IconifyIcon } from '@iconify/svelte';
	import Icon from '@iconify/svelte';

	export let icon: IconifyIcon;
	export let title = '';
</script>

<button
	class="p-1 text-neutral-200 transition-all hover:text-violet-500 active:scale-90 active:text-violet-400"
	{title}
	on:click
>
	<Icon {icon} class="w-8 h-8" />
</button>
