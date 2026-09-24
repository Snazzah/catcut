<script lang="ts" module>
	import type { IconifyIcon } from '@iconify/svelte';

	export type EditorTab<Id extends string = string> = Readonly<{
		id: Id;
		label: string;
		icon: IconifyIcon;
	}>;
</script>

<script lang="ts" generics="Id extends string">
	import Icon from '@iconify/svelte';

	let {
		tabs,
		active,
		onselect
	}: {
		tabs: readonly EditorTab<Id>[];
		active: Id;
		onselect: (id: Id) => void;
	} = $props();
</script>

<div
	class="flex min-h-10 w-full items-center justify-around gap-1 overflow-x-auto px-1 md:min-h-12 md:justify-start md:px-0"
	role="tablist"
	aria-label="Editing tools"
>
	{#each tabs as tab (tab.id)}
		<button
			type="button"
			role="tab"
			aria-selected={active === tab.id}
			class={[
				'flex size-8 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-200 motion-reduce:transition-none sm:size-12 md:h-10 md:w-auto md:px-4',
				active === tab.id
					? 'text-accent md:bg-violet-500 md:text-white'
					: 'text-neutral-100 hover:bg-white/8 hover:text-white md:bg-neutral-800'
			]}
			onclick={() => onselect(tab.id)}
			aria-label={tab.label}
		>
			<Icon icon={tab.icon} class="size-5 sm:size-4.5" aria-hidden="true" />
			<span class="hidden md:inline">{tab.label}</span>
		</button>
	{/each}
</div>
