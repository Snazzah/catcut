<script lang="ts">
	import closeIcon from '@iconify-icons/mdi/close';
	import Icon from '@iconify/svelte';
	import { mobile, surfaces } from '$lib/platform.svelte';
	import { Dialog } from 'bits-ui';
	import { onDestroy, type Snippet } from 'svelte';
	import { Drawer } from 'vaul-svelte';
	import DrawerContentScope, { getDrawerDepth } from './DrawerContentScope.svelte';

	let {
		open = $bindable(false),
		title,
		description,
		children,
		buttons,
		onOpenChange
	}: {
		open?: boolean;
		title: string;
		description?: string;
		children: Snippet;
		buttons?: Snippet;
		onOpenChange?: (open: boolean) => void;
	} = $props();

	const DrawerRoot = getDrawerDepth() > 0 ? Drawer.NestedRoot : Drawer.Root;
	const unsubscribeSurface = surfaces.subscribe(() => open);

	function handleOpenChange(nextOpen: boolean) {
		open = nextOpen;
		onOpenChange?.(nextOpen);
	}

	onDestroy(unsubscribeSurface);
</script>

{#key mobile.current}
	{#if mobile.current}
		<DrawerRoot {open} onOpenChange={handleOpenChange} direction="bottom" autoFocus>
			<Drawer.Portal>
				<Drawer.Overlay class="responsive-modal-overlay fixed inset-0 bg-black/60" />
				<Drawer.Content
					class="responsive-modal-content responsive-modal-drawer fixed inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-2xl border border-white/10 bg-neutral-900 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-neutral-100 shadow-2xl outline-none data-nested:max-h-[85dvh]"
				>
					<DrawerContentScope>
						<div class="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-neutral-600"></div>
						<Drawer.Title class="shrink-0 text-lg font-bold text-white">{title}</Drawer.Title>
						{#if description}
							<Drawer.Description class="mt-1 shrink-0 text-sm text-neutral-400">
								{description}
							</Drawer.Description>
						{/if}
						<div
							class="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4"
							data-vaul-no-drag=""
						>
							{@render children()}
						</div>
						{#if buttons}
							<div
								class="-mx-4 flex shrink-0 items-center justify-end gap-2 border-t border-white/10 px-4 pt-4"
							>
								{@render buttons()}
							</div>
						{/if}
					</DrawerContentScope>
				</Drawer.Content>
			</Drawer.Portal>
		</DrawerRoot>
	{:else}
		<Dialog.Root {open} onOpenChange={handleOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay class="responsive-modal-overlay fixed inset-0 bg-black/60" />
				<Dialog.Content
					class="responsive-modal-content responsive-modal-dialog fixed top-1/2 left-1/2 flex max-h-[min(90dvh,48rem)] w-[min(90vw,32rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-neutral-900 p-6 text-neutral-100 shadow-2xl outline-none"
				>
					<div class="flex shrink-0 items-center justify-between gap-4">
						<Dialog.Title class="text-lg font-bold text-white">{title}</Dialog.Title>
						<Dialog.Close
							aria-label="Close dialog"
							class="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white"
						>
							<Icon icon={closeIcon} class="size-5" aria-hidden="true" />
						</Dialog.Close>
					</div>
					{#if description}
						<Dialog.Description class="mt-1 shrink-0 text-sm text-neutral-400">
							{description}
						</Dialog.Description>
					{/if}
					<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4">
						{@render children()}
					</div>
					{#if buttons}
						<div
							class="-mx-6 flex shrink-0 items-center justify-end gap-2 border-t border-white/10 px-6 pt-4"
						>
							{@render buttons()}
						</div>
					{/if}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	{/if}
{/key}

<style>
	:global(.responsive-modal-overlay) {
		z-index: calc(40 + var(--bits-dialog-depth, 0) * 20);
	}

	:global(.responsive-modal-overlay[data-nested]) {
		display: none;
	}

	:global(.responsive-modal-content) {
		z-index: calc(50 + var(--bits-dialog-depth, 0) * 20);
		scale: calc(1 - var(--bits-dialog-nested-count, 0) * 0.05);
		filter: brightness(calc(1 - var(--bits-dialog-nested-count, 0) * 0.25));
		transition-property: transform, translate, scale, filter !important;
		transition-duration: var(--modal-duration, 200ms) !important;
		transition-timing-function: var(--modal-easing, ease) !important;
	}

	:global(.responsive-modal-dialog) {
		translate: -50% calc(-50% - var(--bits-dialog-nested-count, 0) * 1.5rem);
	}

	:global(.responsive-modal-drawer) {
		--modal-duration: 500ms;
		--modal-easing: cubic-bezier(0.32, 0.72, 0, 1);
		transform-origin: top center;
		translate: 0 calc(var(--bits-dialog-nested-count, 0) * -1.5rem);
	}

	:global(.responsive-modal-drawer.vaul-dragging) {
		transition-property: translate, scale, filter !important;
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.responsive-modal-content) {
			transition: none !important;
		}
	}
</style>
