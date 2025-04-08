<script lang="ts">
	import Icon from '@iconify/svelte';
	import processingIcon from '@iconify-icons/fluent-emoji/crystal-ball';
	import worryIcon from '@iconify-icons/fluent-emoji/worried-face';
	import yayIcon from '@iconify-icons/fluent-emoji/party-popper';
	import { ProcessingState } from '$lib/util';
	import { ffmpegProgress } from '$lib/ffmpeg';
	import { createEventDispatcher } from 'svelte';
	import { scale } from 'svelte/transition';
	import { filesize } from 'filesize';
	import ms from 'pretty-ms';
	import Modal from './Modal.svelte';

	export let open: boolean;
	export let processState: ProcessingState;
	export let resultInfo: { elapsed: number; size: number } | null = null;
	export let speedFactor: number = 1;

	const dispatch = createEventDispatcher();
</script>

<Modal
	{open}
	on:clickout={() => {
		if (
			[ProcessingState.WRITING, ProcessingState.RUNNING, ProcessingState.READING].includes(
				processState
			)
		)
			return;
		dispatch('close');
	}}
	class={`w-96 border-2 px-2 py-4 rounded-xl shadow-md flex-col justify-center items-center text-center inline-flex transition-all ${
		processState === ProcessingState.ERROR
			? 'bg-red-950 border-red-800'
			: processState === ProcessingState.DONE
				? 'bg-green-950 border-green-800'
				: 'bg-blue-950 border-blue-800'
	}`}
>
	<div class="relative w-32 h-32 mb-4 -mt-24">
		{#if processState === ProcessingState.ERROR}
			<div transition:scale class="absolute w-full h-full">
				<Icon icon={worryIcon} class="w-full h-full" />
			</div>
		{:else if processState === ProcessingState.DONE}
			<div transition:scale class="absolute w-full h-full">
				<Icon icon={yayIcon} class="w-full h-full" />
			</div>
		{:else}
			<div transition:scale class="absolute w-full h-full">
				<Icon icon={processingIcon} class="w-full h-full" />
			</div>
		{/if}
	</div>
	<h2 class="font-bold tracking-wide text-2xl">
		{#if processState === ProcessingState.ERROR}
			Oh no...
		{:else if processState === ProcessingState.DONE}
			Done!
		{:else}
			Processing...
		{/if}
	</h2>
	{#if processState === ProcessingState.ERROR}
		<span>An error occurred while processing! Check console for details.</span>
	{:else if processState === ProcessingState.IDLE}
		<span>Waiting...</span>
	{:else if processState === ProcessingState.WRITING}
		<span>Loading file...</span>
	{:else if processState === ProcessingState.RUNNING}
		<span>Running... ({($ffmpegProgress * 100 * speedFactor).toFixed(2)}%)</span>
		<div class="h-2 relative bg-black/50 w-full rounded overflow-hidden mt-2">
			<div class="bg-violet-500 h-full transition-all" style:width={`${$ffmpegProgress * 100 * speedFactor}%`} />
		</div>
	{:else if processState === ProcessingState.READING}
		<span>Reading result...</span>
	{:else if processState === ProcessingState.DONE}
		<span>Your file has finished processing!</span>
	{/if}
	{#if resultInfo}
		<span class="opacity-75 text-sm"
			>{filesize(resultInfo.size, { standard: 'jedec' })} • took {ms(resultInfo.elapsed)}</span
		>
	{/if}
</Modal>
