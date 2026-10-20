<script lang="ts">
	import Icon from '@iconify/svelte';
	import alertIcon from '@iconify-icons/mdi/alert-circle-outline';
	import notFoundIcon from '@iconify-icons/mdi/file-question-outline';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	let notFound = $derived(page.status === 404);
	let message = $derived(notFound ? "This page doesn't exist." : page.error?.message);
</script>

<svelte:head>
	<title>{notFound ? 'Not found' : 'Error'} - catcut</title>
</svelte:head>

<main class="flex min-h-[70svh] flex-col items-center justify-center gap-3 p-6 text-center">
	<Icon
		icon={notFound ? notFoundIcon : alertIcon}
		class="size-16 {notFound ? 'text-neutral-200' : 'text-red-400'}"
		aria-hidden="true"
	/>
	<h1 class="text-xl md:text-2xl font-bold text-white">
		{notFound ? 'Page not found' : `Error ${page.status}`}
	</h1>
	{#if message}
		<p class={['max-w-80 text-sm', notFound ? 'text-neutral-400' : 'text-red-400']}>{message}</p>
	{/if}
	<div class="mt-2 flex flex-col items-center gap-2">
		<a
			href={resolve('/')}
			class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-[background-color,scale] hover:bg-violet-500 active:scale-95"
			>Back to catcut</a
		>
	</div>
</main>
