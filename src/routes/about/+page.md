<script>
	import MarkdownContent from '#lib/components/MarkdownContent.svelte';
	import Icon from '@iconify/svelte';
	import githubIcon from '@iconify-icons/mdi/github';
	import heartIcon from '@iconify-icons/mdi/heart';
	import privacyIcon from '@iconify-icons/mdi/file-document';
	import commitIcon from '@iconify-icons/mdi/source-commit';

	import { version } from '$app/env';

	// version.name is the commit SHA when built from git, otherwise a timestamp
	const commitSha = /^[0-9a-f]{40}$/.test(version) ? version : null;
</script>

<svelte:head>
<title>About - catcut</title>
<link href="https://catcut.snaz.in/about" rel="canonical" />
</svelte:head>

<MarkdownContent>

# About

catcut is a webapp that uses [Mediabunny](https://mediabunny.dev) to view, trim, and edit audio and video without uploading anything to a server. Everything is processed in your own browser, and should be pretty fast too.

<a href="https://github.com/Snazzah/catcut" target="_blank">
	<Icon icon={githubIcon} inline class="inline" />
	Source Code
</a><br/><a href="https://github.com/sponsors/Snazzah" target="_blank">
	<Icon icon={heartIcon} inline class="inline" />
	Donate
</a><br/><a href="/privacy">
	<Icon icon={privacyIcon} inline class="inline" />
	Privacy Policy
</a>
<div class="flex gap-4 items-center-safe **:m-0! my-4">
	<a href="https://snazzah.com" target="_blank" class="hover:scale-105 hover:rotate-2 motion-safe:transition-transform">
		<enhanced:img src="../../assets/snazzah.png" sizes="(min-width: 768px) 128px, 64px" alt="Snazzah" class="size-16 md:size-32 rounded-md bg-black/75" />
	</a>
	<div class="flex flex-col">
		<span>Made by</span>
		<h3 class="text-2xl md:text-4xl">Snazzah</h3>
	</div>
</div>

{#if commitSha}<a href="https://github.com/Snazzah/catcut/commit/{commitSha}" target="_blank" class="text-xs">
	Build <span class="font-mono">{commitSha.slice(0, 7)}</span>
</a>{/if}

</MarkdownContent>
