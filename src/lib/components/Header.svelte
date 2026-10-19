<script lang="ts">
	import Icon from '@iconify/svelte';
	import infoIcon from '@iconify-icons/mdi/info-outline';
	import cogIcon from '@iconify-icons/mdi/cog-outline';
	import { catcut } from '#lib/icons.ts';
	import { resolve } from '$app/paths';
	import { mobile } from '#lib/platform.svelte.js';
	import { page } from '$app/state';

	let visible = $state(true);
	let lastScroll = 0;
	let hashChanged = false;
	let atHome = $derived(page.url.pathname === '/');

	function handleScroll() {
		const scroll = window.scrollY;
		if (!mobile.current) visible = true;
		else if (!hashChanged && scroll !== lastScroll) visible = scroll < 50 || scroll < lastScroll;
		lastScroll = scroll;
		hashChanged = false;
	}

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

<svelte:window onscroll={handleScroll} onhashchange={() => (hashChanged = true)} />

<div
	class={[
		'fixed right-0 left-0 isolate z-10 flex items-center justify-center transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] focus-within:translate-y-0 motion-reduce:transition-none',
		mobile.current ? 'bottom-0' : 'max-sm:bottom-0 sm:top-0',
		mobile.current && !visible && 'translate-y-full'
	]}
>
	<header
		class={[
			'relative isolate flex w-full items-center justify-center gap-1 rounded-t-md from-black/85 via-black/70 via-60% to-transparent p-2 md:max-w-xl md:rounded-t-none md:rounded-b-md',
			!atHome
				? mobile.current
					? 'bg-linear-to-t'
					: 'max-sm:bg-linear-to-t sm:bg-linear-to-b'
				: null
		]}
	>
		{#if !atHome}
			<div
				aria-hidden="true"
				class={[
					'pointer-events-none absolute inset-0 -z-10 rounded-[inherit] backdrop-blur-lg',
					mobile.current
						? '[--blur-direction:to_top]'
						: 'max-sm:[--blur-direction:to_top] sm:[--blur-direction:to_bottom]'
				]}
				style:mask-image="linear-gradient(var(--blur-direction), black 50%, transparent 100%)"
			></div>
		{/if}
		<a
			href="/"
			class="text-accent mr-auto flex items-center justify-center gap-1 text-2xl font-black"
		>
			<Icon icon={catcut} class="size-10" />
			<span class="hidden md:contents">catcut</span>
		</a>
		{#each links as link, i (i)}
			<a
				href={link.href}
				class="flex min-w-18 flex-col items-center justify-center rounded-md p-1 text-xs text-neutral-200 hover:bg-neutral-200/10 hover:text-neutral-50 data-active:bg-violet-500/75 data-active:text-white"
				data-active={page.url.pathname === link.href ? 'true' : undefined}
			>
				<Icon icon={link.icon} class="size-6" />
				<span>{link.label}</span>
			</a>
		{/each}
	</header>
</div>
