<script lang="ts">
	import { mobile, surfaces } from '$lib/platform.svelte';
	import { Dialog } from 'bits-ui';
	import { onDestroy, type Snippet } from 'svelte';
	import { Drawer } from 'vaul-svelte';

	let {
		open = $bindable(false),
		title,
		description,
		children,
		onOpenChange
	}: {
		open?: boolean;
		title: string;
		description?: string;
		children: Snippet;
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
				<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-4">
					{@render children()}
				</div>
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
				<Dialog.Title class="shrink-0 text-lg font-bold text-white">{title}</Dialog.Title>
				{#if description}
					<Dialog.Description class="mt-1 shrink-0 text-sm text-neutral-400">
						{description}
					</Dialog.Description>
				{/if}
				<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-4">
					{@render children()}
				</div>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
{/if}
