<script lang="ts">
	import pauseIcon from '@iconify-icons/mdi/pause';
	import playIcon from '@iconify-icons/mdi/play-arrow';
	import replayIcon from '@iconify-icons/mdi/replay';
	import type { PlayerState } from '$lib/player-state.svelte';
	import PlayerButton from '$lib/components/common/PlayerButton.svelte';

	let {
		player,
		offset = 8,
		onclick = () => void player.togglePlayback()
	}: { player: PlayerState; offset?: number; onclick?: () => void } = $props();
</script>

<PlayerButton
	title={player.ended ? 'Replay' : player.paused ? 'Play' : 'Pause'}
	icon={player.ended ? replayIcon : player.paused ? playIcon : pauseIcon}
	key="K"
	{onclick}
	{offset}
/>
