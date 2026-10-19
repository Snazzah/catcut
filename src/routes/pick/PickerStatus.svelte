<script lang="ts">
	import Icon, { type IconifyIcon } from '@iconify/svelte';
	import type { Snippet } from 'svelte';

	let {
		icon,
		title,
		message,
		error = false,
		children
	}: {
		icon: IconifyIcon;
		title: string;
		message?: string | null;
		error?: boolean;
		children?: Snippet;
	} = $props();
</script>

<Icon {icon} class="size-16 text-violet-400" aria-hidden="true" />
<h1 class="text-xl md:text-2xl font-bold text-white">{title}</h1>
{#if message}
	<p class={['max-w-80 text-sm', error ? 'text-red-400' : 'text-neutral-400']}>{message}</p>
{/if}
{#if children}
	<div class="mt-2 flex flex-col items-center gap-2">
		{@render children()}
	</div>
{/if}
