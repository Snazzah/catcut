<script lang="ts">
	import { untrack } from 'svelte';
	import type { MediaSource } from '$lib/media';
	import { PlayerState } from '$lib/player-state.svelte';
	import EditingShell from './editor/EditingShell.svelte';
	import EditorOverlayHost from './editor/EditorOverlayHost.svelte';
	import { EditorSession } from './editor/editor-session.svelte';
	import MediaHeader from './MediaHeader.svelte';
	import Player from './Player.svelte';

	let { source, onclose }: { source: MediaSource; onclose: () => void } = $props();
	const player = new PlayerState(untrack(() => source));
	const editor = new EditorSession(player);
	let workspace: HTMLElement;
	let editing = $state(false);

	$effect(() => {
		editor.initialize();
	});

	function handleClose() {
		if (editing) editing = false;
		else onclose();
	}

	function openEditor() {
		player.setPlaybackRate(1);
		editing = true;
	}

	async function toggleFullscreen() {
		if (document.fullscreenElement) await document.exitFullscreen();
		else await workspace.requestFullscreen();
	}
</script>

<svelte:head>
	{#if player.loadState.status === 'ready'}
		<title>{player.loadState.metadata.tags.title ?? player.filename} - catcut</title>
	{/if}
</svelte:head>

<section
	id="catcut-player"
	class="grid h-full w-full overflow-hidden bg-neutral-950 transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
	class:bg-neutral-900={editing}
	style:grid-template-rows={editing ? 'minmax(0, 1fr) var(--editor-height)' : 'minmax(0, 1fr) 0rem'}
	bind:this={workspace}
>
	<MediaHeader
		{player}
		onclose={handleClose}
		closeLabel={editing ? 'Close editor' : 'Close media'}
	/>

	<div
		class={[
			'min-h-0 overflow-hidden bg-black transition-[padding] duration-300 ease-out motion-reduce:transition-none',
			editing ? 'px-3 pt-[calc(3rem+var(--sait))] pb-3 sm:px-8 sm:pb-4' : ''
		]}
	>
		<Player
			{player}
			onclose={handleClose}
			onedit={openEditor}
			onfullscreen={toggleFullscreen}
			showControls={!editing}
		>
			{#snippet overlay()}
				{#if editing}
					<EditorOverlayHost session={editor} />
				{/if}
			{/snippet}
		</Player>
	</div>

	<div class="min-h-0 overflow-hidden">
		{#if editing}
			<EditingShell session={editor} onfullscreen={toggleFullscreen} />
		{/if}
	</div>
</section>

<style>
	#catcut-player {
		--editor-height: calc(12.5rem + var(--saib));
	}

	@media (min-width: 640px) {
		#catcut-player {
			--editor-height: 16rem;
		}
	}
</style>
