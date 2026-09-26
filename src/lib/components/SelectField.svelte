<script lang="ts" module>
	import type { IconifyIcon } from '@iconify/svelte';

	export type SelectOption<Value extends string = string> = Readonly<{
		value: Value;
		label: string;
	}>;
</script>

<script lang="ts" generics="Value extends string">
	import checkIcon from '@iconify-icons/mdi/check';
	import chevronDownIcon from '@iconify-icons/mdi/chevron-down';
	import Icon from '@iconify/svelte';
	import { Select } from 'bits-ui';

	let {
		label,
		icon,
		value,
		options,
		onchange
	}: {
		label: string;
		icon?: IconifyIcon;
		value: Value;
		options: readonly SelectOption<Value>[];
		onchange: (value: Value) => void;
	} = $props();

	function handleValueChange(nextValue: string) {
		const option = options.find((o) => o.value === nextValue);
		if (option) onchange(option.value);
	}
</script>

<Select.Root
	type="single"
	{value}
	items={options.map((option) => ({ ...option }))}
	onValueChange={handleValueChange}
>
	<Select.Trigger
		aria-label={label}
		class="flex h-9 min-w-36 shrink-0 cursor-pointer items-center gap-2 rounded-md bg-neutral-900 px-3 text-sm text-neutral-100 ring-white/8 outline-none hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-violet-200 data-[state=open]:bg-neutral-800"
	>
		{#if icon}
			<Icon {icon} class="size-4 shrink-0 text-neutral-300" aria-hidden="true" />
		{/if}
		<span class="mr-1 font-bold text-neutral-300">{label}</span>
		<Select.Value class="min-w-0 flex-1 truncate text-left font-medium" />
		<Icon icon={chevronDownIcon} class="size-4 shrink-0 text-neutral-400" aria-hidden="true" />
	</Select.Trigger>

	<Select.Portal>
		<Select.Content
			class="z-50 min-w-(--bits-select-anchor-width) overflow-hidden rounded-md border border-white/10 bg-neutral-900 p-1 text-sm text-neutral-100 shadow-xl outline-none"
			sideOffset={4}
		>
			<Select.Viewport>
				{#each options as option (option.value)}
					<Select.Item
						value={option.value}
						label={option.label}
						class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 outline-none data-highlighted:bg-violet-500 data-highlighted:text-white"
					>
						{#snippet children({ selected })}
							<span class="flex-1">{option.label}</span>
							{#if selected}
								<Icon icon={checkIcon} class="size-4" aria-hidden="true" />
							{/if}
						{/snippet}
					</Select.Item>
				{/each}
			</Select.Viewport>
		</Select.Content>
	</Select.Portal>
</Select.Root>
