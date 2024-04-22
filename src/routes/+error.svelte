<script lang="ts">
	import { page } from '$app/stores';
	import Icon from '@iconify/svelte';
	import cancelIcon from '@iconify-icons/mdi/cancel';
</script>

<main class="flex flex-col items-center justify-center min-h-screen">
	<Icon icon={cancelIcon} class="w-16 h-16 text-red-500" />
	<br />
	<h1 class="text-5xl font-bold text-white">{$page.status}</h1>
	<h3 class="text-2xl">{$page.error?.message}</h3>
	<br />
	<a href="/" class="px-4 py-2 rounded transition-all bg-neutral-700 hover:bg-neutral-600">
		Back to Homepage
	</a>
</main>
