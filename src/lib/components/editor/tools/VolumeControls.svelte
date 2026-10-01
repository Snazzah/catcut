<script lang="ts">
	import volumeIcon from '@iconify-icons/mdi/volume-high';
	import volumeMutedIcon from '@iconify-icons/mdi/volume-off';
	import PlayerButton from '$lib/components/common/PlayerButton.svelte';
	import PlayerSlider from '$lib/components/PlayerSlider.svelte';
	import type { EditorSession } from '../editor-session.svelte';

	let { session }: { session: EditorSession } = $props();

	let adjustment = $derived(session.audioAdjustment ?? { volume: 1 });
	let volume = $derived(adjustment.volume);
</script>

<div class="flex h-13 items-center justify-center sm:justify-start gap-3" role="group" aria-label="Export volume">
	<PlayerButton
		title={volume === 0 ? 'Restore audio' : 'Remove audio'}
		icon={volume === 0 ? volumeMutedIcon : volumeIcon}
		onclick={() => session.updateAudioAdjustment({ volume: volume === 0 ? 1 : 0 })}
	/>
	<PlayerSlider
		class="w-48 sm:w-64"
		min={0}
		max={3}
		step={0.01}
		value={volume}
		onValueChange={(volume) => session.updateAudioAdjustment({ volume })}
		label="Set volume"
	/>
	<span class="w-12 text-right text-sm text-neutral-300 tabular-nums"
		>{Math.round(volume * 100)}%</span
	>
</div>
