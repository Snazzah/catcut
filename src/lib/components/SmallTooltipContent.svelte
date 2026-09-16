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

<Tooltip.Portal>
	<Tooltip.Content
		sideOffset={offset}
		collisionPadding={8}
		class="origin-(--bits-tooltip-content-transform-origin)"
	>
		<div
			class={['z-0 flex items-center justify-center rounded bg-neutral-900/75 px-2 py-1 text-sm font-semibold text-white outline-hidden backdrop-blur-lg shadow-sm shadow-black/75', className]}
		>
			{@render children?.()}
			{#if key}
				<kbd class="ml-1 rounded-sm border border-neutral-400 px-1 tabular-nums text-xs">{key}</kbd>
			{/if}
		</div>
	</Tooltip.Content>
</Tooltip.Portal>
