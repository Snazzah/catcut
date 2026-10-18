<script lang="ts">
	import { Switch } from 'bits-ui';
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		checked = $bindable(),
		disabled = false
	}: {
		title: string;
		description?: string | Snippet;
		checked: boolean;
		disabled?: boolean;
	} = $props();

	const id = $props.id();
</script>

<div class="flex items-center justify-between gap-4">
	<div class="flex flex-col gap-0.5">
		<label for="{id}-switch" class="font-medium text-neutral-200">{title}</label>
		{#if description}
			<p id="{id}-description" class="text-sm text-neutral-400">
				{#if typeof description === 'string'}
					{description}
				{:else}
					{@render description()}
				{/if}
			</p>
		{/if}
	</div>
	<Switch.Root
		id="{id}-switch"
		bind:checked
		{disabled}
		aria-describedby={description ? `${id}-description` : undefined}
		class="relative h-6 w-11 shrink-0 cursor-pointer rounded-full bg-neutral-700 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-violet-200 disabled:cursor-default disabled:opacity-50 data-[state=checked]:bg-violet-500 motion-reduce:transition-none"
	>
		<Switch.Thumb
			class="pointer-events-none absolute top-1 left-1 block size-4 rounded-full bg-white transition-transform duration-150 data-[state=checked]:translate-x-5 motion-reduce:transition-none"
		/>
	</Switch.Root>
</div>
