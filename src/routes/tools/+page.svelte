<script lang="ts">
	import { resolve } from '$app/paths';
	import PageContent from '#lib/components/PageContent.svelte';
	import Icon from '@iconify/svelte';
	import metadataIcon from '@iconify-icons/mdi/tag-text-outline';
	import chevronIcon from '@iconify-icons/mdi/chevron-right';

	const tools = [
		{
			icon: metadataIcon,
			label: 'Metadata editor',
			description: 'Edit metadata tags and cover art of audio and video files.',
			path: '/tools/metadata'
		},
	] as const;
</script>

<svelte:head>
	<title>Tools - catcut</title>
	<link href="https://catcut.snaz.in/tools" rel="canonical" />
</svelte:head>

<PageContent>
	<h1 class="mb-3 text-2xl font-bold text-white">Tools</h1>

	<div class="flex flex-col gap-2">
		{#each tools as tool (tool.path)}
			<a
				href={resolve(tool.path)}
				class="flex items-center gap-3 rounded-lg bg-neutral-800 p-3 transition-[background-color,scale] outline-none hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-violet-200 active:scale-[0.98]"
			>
				<Icon icon={tool.icon} class="size-8 shrink-0 text-violet-400" />
				<div class="flex min-w-0 flex-col">
					<span class="font-medium text-white">{tool.label}</span>
					<span class="text-sm text-neutral-400">{tool.description}</span>
				</div>
				<Icon icon={chevronIcon} class="ml-auto size-6 shrink-0 text-neutral-500" />
			</a>
		{/each}
	</div>
</PageContent>
