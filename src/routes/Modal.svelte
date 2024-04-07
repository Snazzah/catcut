<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	import Portal from 'svelte-portal';
	import { fade, fly } from 'svelte/transition';

	export let open = true;
	export let className = '';

	let dispatch = createEventDispatcher();

	function onModalClick(this: any, e: any) {
		if (e.target === this) dispatch('clickout');
	}
</script>


{#if open}
	<Portal target="body">
		<div
			transition:fade={{ duration: 100 }}
			class="fixed top-0 bottom-0 left-0 right-0 bg-black/25 backdrop-blur-md select-none flex items-center justify-center md:px-8 px-2 z-30 text-neutral-200"
			aria-hidden="true"
			on:click={onModalClick}
		>
			<div
				transition:fly={{ duration: 250, y: 32 }}
				class={className || "w-96 border-2 p-2 rounded-md shadow-md flex-col justify-start items-start inline-flex bg-neutral-900 border-neutral-700"}
			>
				<slot />
			</div>
		</div>
	</Portal>
{/if}
