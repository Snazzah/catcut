<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';

	let {
		children,
		key,
		class: className = '',
		offset = 36
	}: { children?: Snippet; offset?: number; key?: string; class?: string; } = $props();
</script>

<Tooltip.Content
	sideOffset={offset}
	collisionPadding={8}
	class="animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--bits-tooltip-content-transform-origin)"
>
	<div
		class={['z-0 flex items-center justify-center rounded bg-neutral-900/75 px-2 py-1 text-sm font-semibold text-white outline-hidden backdrop-blur-lg', className]}
	>
		{@render children?.()}
		{#if key}
			<kbd class="ml-1 rounded-sm border border-neutral-400 px-1 tabular-nums text-xs">{key}</kbd>
		{/if}
	</div>
</Tooltip.Content>
