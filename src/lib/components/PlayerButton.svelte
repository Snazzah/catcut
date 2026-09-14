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
		offset = 36,
		key
	}: {
		icon: IconifyIcon;
		title: string;
		key?: string;
		onclick?: MouseEventHandler<HTMLButtonElement>;
		offset?: number;
	} = $props();
</script>

<Tooltip.Root delayDuration={200} disableHoverableContent>
	<Tooltip.Trigger {onclick} aria-label={title}>
		{#snippet child({ props })}
			<button class="cursor-pointer rounded-full hover:text-violet-300" {...props}>
				<Icon {icon} class="size-6" />
			</button>
		{/snippet}
	</Tooltip.Trigger>
	<SmallTooltipContent {offset} {key}>
		{title}
	</SmallTooltipContent>
</Tooltip.Root>
