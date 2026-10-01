<script lang="ts">
	import volumeIcon from '@iconify-icons/mdi/volume-high';
	import volumeMutedIcon from '@iconify-icons/mdi/volume-off';
	import { Tooltip } from 'bits-ui';
	import type { PlayerState } from '$lib/player-state.svelte';
	import { mobile } from '$lib/platform.svelte';
	import PlayerButton from './common/PlayerButton.svelte';
	import PlayerSlider from './PlayerSlider.svelte';
	import SmallTooltipContent from '$lib/components/common/SmallTooltipContent.svelte';

	let {
		player,
		offset = 8,
		alwaysExpanded = false
	}: { player: PlayerState; offset?: number; alwaysExpanded?: boolean } = $props();

	let hovered = $state(false);
	let focused = $state(false);
	let expanded = $derived(alwaysExpanded || hovered || focused);

	function handleFocusOut(event: FocusEvent) {
		if (
			event.currentTarget instanceof HTMLElement &&
			event.relatedTarget instanceof Node &&
			event.currentTarget.contains(event.relatedTarget)
		)
			return;
		focused = false;
	}
</script>

{#if player.hasAudio}
	<div
		class="flex shrink-0 items-center gap-3"
		role="group"
		aria-label="Volume controls"
		onpointerenter={() => (hovered = true)}
		onpointerleave={() => (hovered = false)}
		onfocusin={() => (focused = true)}
		onfocusout={handleFocusOut}
	>
		<PlayerButton
			title={player.muted ? 'Unmute' : 'Mute'}
			icon={player.muted ? volumeMutedIcon : volumeIcon}
			onclick={() => player.toggleMuted()}
			key="M"
			{offset}
		/>

		{#if !mobile.current}
			<div
				class={[
					'transition-[width,opacity] duration-200 ease-out motion-reduce:transition-none',
					expanded ? 'w-28 opacity-100' : 'pointer-events-none w-0 opacity-0'
				]}
				aria-hidden={!expanded}
			>
				<Tooltip.Root
					delayDuration={200}
					disabled={!expanded}
					disableHoverableContent
					disableCloseOnTriggerClick
				>
					<Tooltip.Trigger tabindex={-1} type={undefined}>
						{#snippet child({ props })}
							<div {...props}>
								<PlayerSlider
									class="w-24"
									min={0}
									max={1}
									step={0.01}
									white
									value={player.volume}
									disabled={!expanded}
									onValueChange={(volume) => player.setVolume(volume)}
									label="Volume"
								/>
							</div>
						{/snippet}
					</Tooltip.Trigger>
					<SmallTooltipContent class="tabular-nums">
						Volume: {Math.round(player.volume * 100)}%
					</SmallTooltipContent>
				</Tooltip.Root>
			</div>
		{/if}
	</div>
{:else}
	<PlayerButton title="Media has no audio" icon={volumeMutedIcon} disabled {offset} />
{/if}
