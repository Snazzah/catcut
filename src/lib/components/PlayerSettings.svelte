<script lang="ts">
	import arrowLeftIcon from '@iconify-icons/mdi/arrow-left';
	import chevronRightIcon from '@iconify-icons/mdi/chevron-right';
	import cogIcon from '@iconify-icons/mdi/cog';
	import speedometerIcon from '@iconify-icons/mdi/speedometer';
	import Icon from '@iconify/svelte';
	import PlayerButton from './PlayerButton.svelte';
	import PlayerSlider from './PlayerSlider.svelte';
	import ResponsiveMenu from './ResponsiveMenu.svelte';

	let {
		playbackRate,
		onPlaybackRateChange
	}: {
		playbackRate: number;
		onPlaybackRateChange: (playbackRate: number) => void;
	} = $props();

	let page = $state<'settings' | 'playback-speed'>('settings');

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) page = 'settings';
	}
</script>

<ResponsiveMenu title="Player settings" onOpenChange={handleOpenChange}>
	{#snippet trigger({ props })}
		<PlayerButton triggerProps={props} title="Settings" offset={36} icon={cogIcon} />
	{/snippet}

	{#if page === 'settings'}
		<button
			type="button"
			class="flex w-full cursor-pointer items-center gap-3 rounded px-3 py-2.5 text-left text-base text-neutral-100 hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none sm:text-sm"
			onclick={() => (page = 'playback-speed')}
		>
			<Icon icon={speedometerIcon} class="size-5 text-neutral-300" aria-hidden="true" />
			<span class="font-medium">Playback speed</span>
			<span class="ml-auto text-neutral-300 tabular-nums">{playbackRate}x</span>
			<Icon icon={chevronRightIcon} class="size-5 text-neutral-400" aria-hidden="true" />
		</button>
	{:else}
		<div class="grid gap-4 px-3 py-2">
			<div class="flex items-center gap-2">
				<button
					type="button"
					class="-ml-1 grid size-8 cursor-pointer place-items-center rounded-full text-neutral-200 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:outline-none"
					onclick={() => (page = 'settings')}
					aria-label="Back to settings"
				>
					<Icon icon={arrowLeftIcon} class="size-5" aria-hidden="true" />
				</button>
				<Icon icon={speedometerIcon} class="size-5 text-neutral-300" aria-hidden="true" />
				<span class="font-medium text-neutral-100">Playback speed</span>
				<span class="ml-auto text-neutral-300 tabular-nums">{playbackRate}x</span>
			</div>

			<div data-vaul-no-drag="">
				<PlayerSlider
					min={0.25}
					max={2}
					step={0.25}
					value={playbackRate}
					onValueChange={onPlaybackRateChange}
					label="Playback speed"
				/>
			</div>
		</div>
	{/if}
</ResponsiveMenu>
