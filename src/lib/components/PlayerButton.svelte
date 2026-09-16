<script lang="ts">
	import type { IconifyIcon } from '@iconify/svelte';
	import Icon from '@iconify/svelte';
	import { Tooltip } from 'bits-ui';
	import type { MouseEventHandler } from 'svelte/elements';
	import SmallTooltipContent from './SmallTooltipContent.svelte';

	let {
		icon,
		onclick,
		title,
		offset = 8,
		key,
		disabled = false,
		triggerProps = {}
	}: {
		icon: IconifyIcon;
		title: string;
		key?: string;
		onclick?: MouseEventHandler<HTMLButtonElement>;
		offset?: number;
		disabled?: boolean;
		triggerProps?: Record<string, unknown>;
	} = $props();
</script>

<Tooltip.Root delayDuration={200} disableHoverableContent>
	<Tooltip.Trigger {onclick} {...triggerProps} aria-label={title}>
		{#snippet child({ props })}
			<button
				class="rounded-full focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:outline-none enabled:cursor-pointer enabled:hover:text-violet-300 disabled:opacity-50"
				{disabled}
				{...props}
			>
				<Icon {icon} class="size-6" aria-hidden="true" />
			</button>
		{/snippet}
	</Tooltip.Trigger>
	<SmallTooltipContent {offset} {key}>
		{title}
	</SmallTooltipContent>
</Tooltip.Root>
