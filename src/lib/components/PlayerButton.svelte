<script lang="ts">
	import type { IconifyIcon } from '@iconify/svelte';
	import Icon from '@iconify/svelte';

	export let icon: IconifyIcon;
	export let canBeSmall = false;
	export let title = '';
</script>

<button
	class="p-1 text-neutral-200 transition-all hover:text-violet-500 active:scale-90 active:text-violet-400"
	{title}
	on:click
>
	<Icon {icon} class={canBeSmall ? `w-5 h-5 sm:w-8 sm:h-8` : `w-8 h-8`} />
</button>
