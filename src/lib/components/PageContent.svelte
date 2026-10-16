<script lang="ts">
	import { resolve } from '$app/paths';
	import { catcut } from '#lib/icons.js';
	import arrowIcon from '@iconify-icons/mdi/arrow-left';
	import Icon from '@iconify/svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<main class="mx-auto min-h-svh w-full max-w-xl p-4 md:pt-18 md:pb-12">
	<section class="mb-4 md:hidden">
		<a
			href={resolve('/')}
			class="flex items-center gap-2 text-xl font-black text-neutral-500 hover:text-neutral-300"
		>
			<Icon icon={arrowIcon} class="size-6" />
			<Icon icon={catcut} class="size-6" />
			<span class="text-accent">catcut</span>
		</a>
	</section>

	{@render children()}
</main>
