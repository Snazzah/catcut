<script lang="ts">
	import { mobile, surfaces } from '#lib/platform.svelte.js';
	import { verticalScrollbars } from '#lib/util/attachments.js';
	import { DropdownMenu, Popover } from 'bits-ui';
	import { onDestroy, type Snippet } from 'svelte';
	import { Drawer } from 'vaul-svelte';

	let {
		title,
		trigger,
		children,
		headerActions,
		onOpenChange,
		popover = false
	}: {
		title: string | Snippet;
		trigger: Snippet<[{ props: Record<string, unknown> }]>;
		children: Snippet;
		headerActions?: Snippet;
		onOpenChange?: (open: boolean) => void;
		popover?: boolean;
	} = $props();

	let open = $state(false);
	let triggerAnchor = $state<HTMLElement>();
	const unsubscribeSurface = surfaces.subscribe(() => open);

	function handleOpenChange(nextOpen: boolean) {
		open = nextOpen;
		onOpenChange?.(nextOpen);
	}

	onDestroy(unsubscribeSurface);
</script>

<span class="inline-flex" bind:this={triggerAnchor}>
	{@render trigger({
		props: {
			onclick: () => handleOpenChange(!open),
			'aria-expanded': open,
			'aria-haspopup': mobile.current || popover ? 'dialog' : 'menu',
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
				<div class="flex shrink-0 items-center justify-between gap-3 px-3 pb-2">
					<Drawer.Title class="text-base font-bold text-white">
						{#if typeof title === 'string'}{title}{:else}{@render title()}{/if}
					</Drawer.Title>
					{@render headerActions?.()}
				</div>
				<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">
					{@render children()}
				</div>
			</Drawer.Content>
		</Drawer.Portal>
	</Drawer.Root>
{:else if popover}
	<Popover.Root {open} onOpenChange={handleOpenChange}>
		<Popover.Portal>
			<Popover.Content
				class="z-50 max-h-[min(24rem,calc(100vh-5rem))] w-72 overflow-y-auto overscroll-contain rounded-md border border-white/10 bg-neutral-900 p-1 shadow-xl outline-none"
				customAnchor={triggerAnchor}
				sideOffset={8}
				align="end"
			>
				{#snippet child({ wrapperProps, props })}
					<div {...wrapperProps}>
						<div {...props} data-overlayscrollbars-initialize {@attach verticalScrollbars}>
							{@render children()}
						</div>
					</div>
				{/snippet}
			</Popover.Content>
		</Popover.Portal>
	</Popover.Root>
{:else}
	<DropdownMenu.Root {open} onOpenChange={handleOpenChange}>
		<DropdownMenu.Portal>
			<DropdownMenu.Content
				class="z-50 max-h-[min(24rem,calc(100vh-5rem))] w-72 overflow-y-auto overscroll-contain rounded-md border border-white/10 bg-neutral-900 p-1 shadow-xl outline-none"
				customAnchor={triggerAnchor}
				sideOffset={8}
				align="end"
			>
				{#snippet child({ wrapperProps, props })}
					<div {...wrapperProps}>
						<div {...props} data-overlayscrollbars-initialize {@attach verticalScrollbars}>
							{@render children()}
						</div>
					</div>
				{/snippet}
			</DropdownMenu.Content>
		</DropdownMenu.Portal>
	</DropdownMenu.Root>
{/if}
