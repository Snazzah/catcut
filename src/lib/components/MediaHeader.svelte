<script lang="ts">
	import closeIcon from '@iconify-icons/mdi/close';
	import type { PlayerState } from '#lib/player-state.svelte.js';
	import PlayerButton from '#lib/components/common/PlayerButton.svelte';
	import PlayerInfo from './PlayerInfo.svelte';
	import PlayerQueue from './PlayerQueue.svelte';
	import Icon from '@iconify/svelte';
	import videoIcon from '@iconify-icons/mdi/movie';
	import audioIcon from '@iconify-icons/mdi/music-note';
	import loadingIcon from '@iconify-icons/mdi/loading';

	let {
		player,
		onclose,
		closeLabel,
		visible = true
	}: {
		player: PlayerState;
		onclose: () => void;
		closeLabel: string;
		visible?: boolean;
	} = $props();
</script>

<header
	class={[
		'absolute inset-x-0 top-0 z-40 flex min-h-[calc(3rem+var(--sait))] items-center justify-between gap-2 bg-linear-to-t from-black/0 via-black/70 to-black px-3 pt-(--sait) text-white transition-opacity duration-200',
		visible ? 'opacity-100' : 'pointer-events-none opacity-0'
	]}
	aria-hidden={!visible}
	inert={!visible}
>
	<Icon
		icon={player.loadState.status === 'loading'
			? loadingIcon
			: player.hasVideo || !!player.videoTrack
				? videoIcon
				: audioIcon}
		class={['size-6', player.loadState.status === 'loading' && 'animate-spin']}
		aria-hidden="true"
	/>
	<div class="min-w-0 flex-1 py-2 font-medium">
		<span class="block truncate">{player.filename}</span>
	</div>

	<div class="flex shrink-0 items-center gap-3 text-neutral-50">
		<PlayerInfo {player} />
		<PlayerQueue />
		<PlayerButton title={closeLabel} icon={closeIcon} onclick={onclose} key="Esc" />
	</div>
</header>
