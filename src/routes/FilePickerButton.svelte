<script lang="ts">
	import Icon, { type IconifyIcon } from '@iconify/svelte';
	import { offset, shift } from 'svelte-floating-ui/dom';
	import { createFloatingActions } from 'svelte-floating-ui';
	import { scale } from 'svelte/transition';
	import Portal from 'svelte-portal';
	export let icon: IconifyIcon;
	export let title: string;

	let showTooltip = false;
	const [floatingRef, floatingContent] = createFloatingActions({
		strategy: 'absolute',
		placement: 'bottom',
		middleware: [
			offset(8),
			shift()
		]
	});
</script>


<button
	on:mouseenter={() => showTooltip = true}
	on:mouseleave={() => showTooltip = false}
	on:mousedown={() => showTooltip = false}
	on:focus={() => showTooltip = true}
	on:blur={() => showTooltip = false}
	aria-label={title}
	on:click|stopPropagation
	use:floatingRef
	class="transition-colors hover:text-white focus:text-white rounded-full outline-none"
>
	<Icon {icon} class="w-6 h-6" />
</button>

{#if showTooltip}
	<Portal target="body">
		<div
			class="max-w-[240px] text-xs md:text-sm z-20 text-center absolute px-2 md:px-4 py-2 bg-neutral-900 text-white bg-opacity-90 rounded shadow-md backdrop-blur-sm flex-col justify-center items-center inline-flex select-none"
			transition:scale={{ duration: 250, start: 0.9 }}
			use:floatingContent
		>
			{title}
		</div>
	</Portal>
{/if}
