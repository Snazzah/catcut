<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { Drawer } from 'vaul-svelte';

	let {
		title,
		trigger,
		children,
		onOpenChange
	}: {
		title: string;
		trigger: Snippet<[{ props: Record<string, unknown> }]>;
		children: Snippet;
		onOpenChange?: (open: boolean) => void;
	} = $props();

	const mobile = new MediaQuery('max-width: 639px', false);
	let open = $state(false);
	let triggerAnchor = $state<HTMLElement>();

	function handleOpenChange(nextOpen: boolean) {
		open = nextOpen;
		onOpenChange?.(nextOpen);
	}

	function toggleOpen() {
		handleOpenChange(!open);
	}
</script>

<span class="inline-flex" bind:this={triggerAnchor}>
	{@render trigger({
		props: {
			onclick: toggleOpen,
			'aria-expanded': open,
			'aria-haspopup': mobile.current ? 'dialog' : 'menu',
			'data-state': open ? 'open' : 'closed'
		}
	})}
</span>

{#if mobile.current}
	<Drawer.Root {open} onOpenChange={handleOpenChange} direction="bottom">
		<Drawer.Portal>
			<Drawer.Overlay class="fixed inset-0 z-40 bg-black/60" />
			<Drawer.Content
				class="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl border border-white/10 bg-neutral-900 p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] text-neutral-100 shadow-2xl outline-none"
			>
				<div class="mx-auto my-2 h-1 w-10 shrink-0 rounded-full bg-neutral-600"></div>
			<Drawer.Title class="shrink-0 px-3 pb-2 text-base font-bold text-white">{title}</Drawer.Title>
			<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">{@render children()}</div>
			</Drawer.Content>
		</Drawer.Portal>
	</Drawer.Root>
{:else}
	<DropdownMenu.Root {open} onOpenChange={handleOpenChange}>
		<DropdownMenu.Portal>
			<DropdownMenu.Content
				class="z-50 max-h-[min(24rem,calc(100vh-5rem))] w-72 overflow-y-auto overscroll-contain rounded-md border border-white/10 bg-neutral-900 p-1 shadow-xl outline-none"
				customAnchor={triggerAnchor}
				sideOffset={8}
				align="end"
			>
				{@render children()}
			</DropdownMenu.Content>
		</DropdownMenu.Portal>
	</DropdownMenu.Root>
{/if}
