<script lang="ts">
	import Icon from "@iconify/svelte";
	import uncheckIcon from '@iconify-icons/mdi/checkbox-blank-outline';
	import checkIcon from '@iconify-icons/mdi/checkbox-marked';
	import infoIcon from '@iconify-icons/mdi/information-slab-circle';
	import { autoPlacement, offset, shift } from 'svelte-floating-ui/dom';
	import { createFloatingActions } from 'svelte-floating-ui';
	import { scale } from 'svelte/transition';
	import Portal from 'svelte-portal';

	export let checked: boolean;
	export let disabled = false;
	export let info = '';
	let showInfo = false;
	const [floatingRef, floatingContent] = createFloatingActions({
		strategy: 'absolute',
		placement: 'top',
		middleware: [
			offset(16),
			shift(),
			autoPlacement({
				allowedPlacements: ['top', 'bottom']
			})
		]
	});
</script>

<button
	class="px-4 py-2 group rounded transition-colors bg-neutral-400/10 flex gap-2 items-center w-full disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-white"
	{disabled}
	on:click
>
	<Icon
		icon={checked ? checkIcon : uncheckIcon}
		class={`w-6 h-6 transition-all group-active:scale-90 ${checked ? 'text-violet-500' : ''}`}
	/>
	<span><slot /></span>
	{#if info}
		<button
			on:mouseenter={() => showInfo = true}
			on:mouseleave={() => showInfo = false}
			on:focus={() => showInfo = true}
			on:blur={() => showInfo = false}
			on:click|stopPropagation
			use:floatingRef
		>
			<Icon icon={infoIcon} class="w-4 h-4 transition-all text-neutral-400 hover:text-white" />
		</button>
	{/if}
</button>

{#if showInfo}
	<Portal target="body">
		<div
			class="max-w-[240px] text-sm md:text-base z-20 text-center absolute px-2 md:px-4 py-2 bg-neutral-900 text-white bg-opacity-90 rounded shadow-md backdrop-blur-sm flex-col justify-center items-center inline-flex select-none"
			transition:scale={{ duration: 250, start: 0.9 }}
			use:floatingContent
		>
			{info}
		</div>
	</Portal>
{/if}
