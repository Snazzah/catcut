<script lang="ts">
	import Icon from '@iconify/svelte';
	import dropboxIcon from '@iconify-icons/mdi/dropbox';
	import { onMount } from 'svelte';

	onMount(() => (location.href = '/'));
</script>

<svelte:head>
	<title>Dropbox Chooser - catcut</title>
</svelte:head>

<main class="flex flex-col items-center justify-center min-h-screen overflow-hidden">
	<Icon icon={dropboxIcon} class="w-48 h-48" />
	<span class="text-white">The chooser has been integrated into the main page, redirecting...</span>
</main>
