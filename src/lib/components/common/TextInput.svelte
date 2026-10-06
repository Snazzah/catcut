<script lang="ts">
	import Icon from '@iconify/svelte';
	import revertIcon from '@iconify-icons/mdi/restore';
	import { Tooltip } from 'bits-ui';
	import SmallTooltipContent from './SmallTooltipContent.svelte';

	const inputId = $props.id();
	let {
		label,
		value = $bindable(''),
		changed = false,
		onrevert
	}: {
		label: string;
		value?: string;
		changed?: boolean;
		onrevert?: () => void;
	} = $props();
</script>

<div class="flex flex-col gap-1 text-sm text-neutral-300">
	<label for={inputId}>{label}</label>
	<div class="relative">
		<input
			id={inputId}
			class={[
				'w-full min-w-0 rounded-md border bg-neutral-900 px-3 py-2 text-neutral-100',
				changed && onrevert && 'pr-10',
				changed ? 'border-orange-400' : 'border-white/10'
			]}
			bind:value
		/>
		{#if changed && onrevert}
			<Tooltip.Root delayDuration={200} disableHoverableContent>
				<Tooltip.Trigger aria-label={`Revert ${label}`}>
					{#snippet child({ props })}
						<button
							type="button"
							class="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:outline-none"
							{...props}
							onclick={onrevert}
						>
							<Icon icon={revertIcon} class="size-5" aria-hidden="true" />
						</button>
					{/snippet}
				</Tooltip.Trigger>
				<SmallTooltipContent offset={8}>Revert {label}</SmallTooltipContent>
			</Tooltip.Root>
		{/if}
	</div>
</div>
