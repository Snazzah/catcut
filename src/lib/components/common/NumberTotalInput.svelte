<script lang="ts">
	import Icon from '@iconify/svelte';
	import revertIcon from '@iconify-icons/mdi/restore';
	import { Tooltip } from 'bits-ui';
	import SmallTooltipContent from './SmallTooltipContent.svelte';

	let {
		label,
		value = $bindable(),
		total = $bindable(),
		changed = false,
		totalChanged = false,
		onrevert,
		onreverttotal
	}: {
		label: string;
		value?: number;
		total?: number;
		changed?: boolean;
		totalChanged?: boolean;
		onrevert?: () => void;
		onreverttotal?: () => void;
	} = $props();

	function updateNumber(event: Event, part: 'value' | 'total') {
		const input = event.currentTarget;
		if (!(input instanceof HTMLInputElement)) return;
		const next = input.value === '' ? undefined : Number(input.value);
		if (
			!/^\d*$/.test(input.value) ||
			(next !== undefined && (!Number.isSafeInteger(next) || next < 1))
		) {
			input.value = String((part === 'value' ? value : total) ?? '');
			return;
		}
		if (part === 'value') value = next;
		else total = next;
		input.value = String(next ?? '');
	}
</script>

{#snippet input(part: 'value' | 'total', name: string, edited: boolean, revert?: () => void)}
	<div class="relative min-w-0 flex-1">
		<input
			type="number"
			inputmode="numeric"
			pattern="[0-9]*"
			aria-label={name}
			class={[
				'w-full min-w-0 rounded-md border bg-neutral-900 px-3 py-2 text-neutral-100',
				edited && revert && 'pr-10',
				edited ? 'border-orange-400' : 'border-white/10'
			]}
			value={(part === 'value' ? value : total) ?? ''}
			oninput={(event) => updateNumber(event, part)}
		/>
		{#if edited && revert}
			<Tooltip.Root delayDuration={200} disableHoverableContent>
				<Tooltip.Trigger aria-label={`Revert ${name}`}>
					{#snippet child({ props })}
						<button
							type="button"
							class="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:outline-none"
							{...props}
							onclick={revert}
						>
							<Icon icon={revertIcon} class="size-5" aria-hidden="true" />
						</button>
					{/snippet}
				</Tooltip.Trigger>
				<SmallTooltipContent offset={8}>Revert {name}</SmallTooltipContent>
			</Tooltip.Root>
		{/if}
	</div>
{/snippet}

<fieldset class="flex min-w-0 flex-col gap-1 text-sm text-neutral-300">
	<legend class="mb-1">{label}</legend>
	<div class="flex items-center gap-2">
		{@render input('value', `${label} number`, changed, onrevert)}
		<span>of</span>
		{@render input('total', `${label} total`, totalChanged, onreverttotal)}
	</div>
</fieldset>
