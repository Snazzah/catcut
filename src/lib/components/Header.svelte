<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import infoIcon from '@iconify-icons/mdi/info-outline';
	import cogIcon from '@iconify-icons/mdi/cog-outline';
	import installIcon from '@iconify-icons/mdi/tray-arrow-down';
	import { catcut } from '#lib/icons.ts';
	import { resolve } from '$app/paths';
	import { mobile } from '#lib/platform.svelte.js';
	import { page } from '$app/state';
	import { install, update } from '#lib/install.svelte.js';
	import updateIcon from '@iconify-icons/mdi/update';

	let visible = $state(true);
	let scrolled = $state(false);
	let scrollable = $state(false);
	let lastScroll = 0;
	let hashChanged = false;
	let atHome = $derived(page.url.pathname === '/');

	function handleScroll() {
		const scroll = window.scrollY;
		scrolled = scroll > 0;
		if (!mobile.current) visible = true;
		else if (!hashChanged && scroll !== lastScroll) visible = scroll < 50 || scroll < lastScroll;
		lastScroll = scroll;
		hashChanged = false;
	}

	function updateScrollable() {
		scrollable = document.documentElement.scrollHeight > window.innerHeight;
	}

	onMount(() => {
		scrolled = window.scrollY > 0;
		updateScrollable();

		const observer = new ResizeObserver(updateScrollable);
		observer.observe(document.documentElement);
		return () => observer.disconnect();
	});

	const links = [
		{
			icon: infoIcon,
			label: 'About',
			href: resolve('about')
		},
		{
			icon: cogIcon,
			label: 'Settings',
			href: resolve('settings')
		}
	];
</script>

<svelte:window
	onscroll={handleScroll}
	onresize={updateScrollable}
	onhashchange={() => (hashChanged = true)}
/>

<div
	class={[
		'fixed right-0 left-0 isolate z-10 flex items-center justify-center transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] focus-within:translate-y-0 motion-reduce:transition-none',
		mobile.current ? 'bottom-0' : 'max-sm:bottom-0 sm:top-0',
		mobile.current && !visible && 'translate-y-full'
	]}
>
	{#if !atHome}
		{@const fadeClass = [
			'pointer-events-none absolute inset-0 -z-10 transition-opacity duration-200 motion-reduce:transition-none',
			mobile.current
				? !scrollable && 'opacity-0'
				: [!scrolled && 'sm:opacity-0', !scrollable && 'max-sm:opacity-0']
		]}
		<div
			aria-hidden="true"
			class={[
				fadeClass,
				'from-black/85 via-black/70 via-60% to-transparent',
				mobile.current ? 'bg-linear-to-t' : 'max-sm:bg-linear-to-t sm:bg-linear-to-b'
			]}
		></div>
		<div
			aria-hidden="true"
			class={[
				fadeClass,
				'backdrop-blur-lg',
				mobile.current
					? '[--blur-direction:to_top]'
					: 'max-sm:[--blur-direction:to_top] sm:[--blur-direction:to_bottom]'
			]}
			style:mask-image="linear-gradient(var(--blur-direction), black 50%, transparent 100%)"
		></div>
	{/if}
	<header class="flex w-full items-center justify-center gap-1 p-2 md:max-w-xl">
		<a
			href="/"
			class="text-accent mr-auto flex items-center justify-center gap-1 text-2xl font-black transition-all active:scale-95"
		>
			<Icon icon={catcut} class="size-10" />
			<span class="hidden md:contents">catcut</span>
		</a>
		{#if update.available || install.available}
			<button
				onclick={() => (update.available ? update.apply() : install.prompt())}
				class="flex min-w-18 cursor-pointer flex-col items-center justify-center rounded-md p-1 text-xs font-bold text-violet-400 transition-all hover:bg-violet-400/10 hover:text-violet-100 active:scale-95 data-active:bg-violet-500/75"
			>
				<Icon icon={update.available ? updateIcon : installIcon} class="size-6" />
				<span>{update.available ? 'Update' : 'Install'}</span>
			</button>
		{/if}
		{#each links as link, i (i)}
			<a
				href={link.href}
				class="flex min-w-18 flex-col items-center justify-center rounded-md p-1 text-xs text-neutral-200 transition-all hover:bg-neutral-200/10 hover:text-neutral-50 active:scale-95 data-active:bg-violet-500/75 data-active:text-white"
				data-active={page.url.pathname === link.href ? 'true' : undefined}
			>
				<Icon icon={link.icon} class="size-6" />
				<span>{link.label}</span>
			</a>
		{/each}
	</header>
</div>
