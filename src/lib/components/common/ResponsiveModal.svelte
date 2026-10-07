<script lang="ts">
	import closeIcon from '@iconify-icons/mdi/close';
	import Icon from '@iconify/svelte';
	import { mobile, surfaces } from '$lib/platform.svelte';
	import { Dialog } from 'bits-ui';
	import { onDestroy, type Snippet } from 'svelte';
	import { Drawer } from 'vaul-svelte';

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

	const unsubscribeSurface = surfaces.subscribe(() => open);

	function handleOpenChange(nextOpen: boolean) {
		open = nextOpen;
		onOpenChange?.(nextOpen);
	}

	onDestroy(unsubscribeSurface);
</script>

{#if mobile.current}
	<Drawer.Root {open} onOpenChange={handleOpenChange} direction="bottom">
		<Drawer.Portal>
			<Drawer.Overlay class="fixed inset-0 z-40 bg-black/60" />
			<Drawer.Content
				class="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-2xl border border-white/10 bg-neutral-900 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-neutral-100 shadow-2xl outline-none"
			>
				<div class="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-neutral-600"></div>
				<Drawer.Title class="shrink-0 text-lg font-bold text-white">{title}</Drawer.Title>
				{#if description}
					<Drawer.Description class="mt-1 shrink-0 text-sm text-neutral-400">
						{description}
					</Drawer.Description>
				{/if}
				<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4" data-vaul-no-drag="">
					{@render children()}
				</div>
				{#if buttons}
					<div
						class="-mx-4 flex shrink-0 items-center justify-end gap-2 border-t border-white/10 px-4 pt-4"
					>
						{@render buttons()}
					</div>
				{/if}
			</Drawer.Content>
		</Drawer.Portal>
	</Drawer.Root>
{:else}
	<Dialog.Root {open} onOpenChange={handleOpenChange}>
		<Dialog.Portal>
			<Dialog.Overlay class="fixed inset-0 z-40 bg-black/60" />
			<Dialog.Content
				class="fixed top-1/2 left-1/2 z-50 flex max-h-[min(90dvh,48rem)] w-[min(90vw,32rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-white/10 bg-neutral-900 p-6 text-neutral-100 shadow-2xl outline-none"
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
