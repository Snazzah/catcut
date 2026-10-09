<script lang="ts">
	import Icon from '@iconify/svelte';
	import speedometerIcon from '@iconify-icons/mdi/speedometer';
	import musicNoteIcon from '@iconify-icons/mdi/music-note';
	import linkIcon from '@iconify-icons/mdi/link-variant';
	import restartIcon from '@iconify-icons/mdi/restart';
	import { Tooltip } from 'bits-ui';
	import SmallTooltipContent from '$lib/components/common/SmallTooltipContent.svelte';
	import PlayerSlider from '$lib/components/PlayerSlider.svelte';
	import type { EditorSession } from '../editor-session.svelte';

	let { session }: { session: EditorSession } = $props();
	let adjustment = $derived(session.speedAdjustment);
</script>

{#if adjustment}
	<div
		class="grid h-full w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 text-sm text-neutral-300 sm:flex sm:w-max sm:min-w-full sm:gap-3"
		role="tabpanel"
		aria-label="Speed and pitch settings"
	>
		<div
			class="col-start-1 row-start-1 grid h-11 min-w-0 grid-cols-[1.5rem_minmax(0,1fr)_4rem] items-center gap-2 sm:h-13 sm:shrink-0 sm:grid-cols-[1.5rem_auto_3rem] sm:gap-3"
		>
			<Tooltip.Root delayDuration={200} disableHoverableContent>
				<Tooltip.Trigger
					type="button"
					aria-label="Speed"
					class="size-6 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
				>
					<Icon icon={speedometerIcon} class="size-6" aria-hidden="true" />
				</Tooltip.Trigger>
				<SmallTooltipContent offset={8}>Speed</SmallTooltipContent>
			</Tooltip.Root>
			<PlayerSlider
				class="w-full sm:w-64"
				min={0.25}
				max={4}
				step={0.05}
				value={adjustment.speed}
				disabled={session.saving}
				label="Set speed"
				onValueChange={(speed) =>
					adjustment && session.updateSpeedAdjustment({ ...adjustment, speed })}
			/>
			<span class="sm:w-12 text-right tabular-nums">{adjustment.speed.toFixed(2)}×</span>
		</div>
		{#if session.player.hasAudio}
			<div
				class="col-start-1 row-start-2 grid h-11 min-w-0 grid-cols-[1.5rem_minmax(0,1fr)_4rem] items-center gap-2 sm:h-13 sm:shrink-0 sm:grid-cols-[1.5rem_auto_3rem] sm:gap-3"
			>
				<Tooltip.Root delayDuration={200} disableHoverableContent>
					<Tooltip.Trigger
						type="button"
						aria-label="Pitch"
						class="size-6 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
					>
						<Icon icon={musicNoteIcon} class="size-6" aria-hidden="true" />
					</Tooltip.Trigger>
					<SmallTooltipContent offset={8}>Pitch in semitones</SmallTooltipContent>
				</Tooltip.Root>
				<PlayerSlider
					class="w-full sm:w-64"
					min={-24}
					max={24}
					step={1}
					value={adjustment.pitchSemitones}
					disabled={session.saving || session.speedPitchSynced}
					label="Set pitch in semitones"
					onValueChange={(pitchSemitones) =>
						adjustment && session.updateSpeedAdjustment({ ...adjustment, pitchSemitones })}
				/>
				<span class="text-right tabular-nums"
					>{adjustment.pitchSemitones > 0 ? '+' : ''}{Number(adjustment.pitchSemitones.toFixed(1))} st</span
				>
			</div>
			<Tooltip.Root delayDuration={200} disableHoverableContent>
				<Tooltip.Trigger
					type="button"
					class={[
						'col-start-2 row-start-1 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-violet-200 disabled:cursor-default disabled:opacity-50',
						session.speedPitchSynced
							? 'bg-violet-400/25 text-violet-400 hover:bg-violet-400/35 hover:text-violet-200'
							: 'text-neutral-200 hover:bg-white/8 hover:text-white'
					]}
					aria-label="Sync pitch with speed"
					aria-pressed={session.speedPitchSynced}
					disabled={session.saving}
					onclick={() => session.toggleSpeedPitchSync()}
				>
					<Icon icon={linkIcon} class="size-6" aria-hidden="true" />
				</Tooltip.Trigger>
				<SmallTooltipContent offset={8}>Sync pitch with speed</SmallTooltipContent>
			</Tooltip.Root>
		{/if}
		<Tooltip.Root delayDuration={200} disableHoverableContent>
			<Tooltip.Trigger
				type="button"
				class={[
					'col-start-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-neutral-200 outline-none hover:bg-white/8 hover:text-white focus-visible:ring-2 focus-visible:ring-violet-200 disabled:cursor-default disabled:text-neutral-600 disabled:hover:bg-transparent',
					session.player.hasAudio ? 'row-start-2' : 'row-start-1'
				]}
				aria-label="Reset speed and pitch"
				disabled={!session.speedChanged || session.saving}
				onclick={() => session.resetSpeed()}
			>
				<Icon icon={restartIcon} class="size-6" aria-hidden="true" />
			</Tooltip.Trigger>
			<SmallTooltipContent offset={8}>Reset speed and pitch</SmallTooltipContent>
		</Tooltip.Root>
	</div>
{/if}
