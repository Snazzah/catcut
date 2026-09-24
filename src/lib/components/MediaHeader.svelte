<script lang="ts">
	import closeIcon from '@iconify-icons/mdi/close';
	import type { PlayerState } from '$lib/player-state.svelte';
	import PlayerButton from './PlayerButton.svelte';
	import PlayerInfo from './PlayerInfo.svelte';

	let {
		player,
		onclose,
		closeLabel
	}: {
		player: PlayerState;
		onclose: () => void;
		closeLabel: string;
	} = $props();
</script>

<header
	class="absolute inset-x-0 top-0 z-40 flex min-h-[calc(3rem+var(--sait))] items-center justify-between gap-3 bg-linear-to-t from-black/0 via-black/70 to-black px-3 pt-(--sait) text-white"
>
	<div class="min-w-0 flex-1 py-2 font-medium">
		<span class="block truncate">{player.filename}</span>
		{#if player.loadState.status === 'ready' && player.loadState.warning}
			<p class="m-0 truncate text-xs text-amber-300" title={player.loadState.warning}>
				{player.loadState.warning}
			</p>
		{/if}
	</div>

	<div class="flex shrink-0 items-center gap-3 text-neutral-50">
		<PlayerInfo {player} />
		<PlayerButton title={closeLabel} icon={closeIcon} onclick={onclose} key="Esc" />
	</div>
</header>
