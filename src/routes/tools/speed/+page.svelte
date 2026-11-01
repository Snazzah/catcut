<script lang="ts">
	import FileDrop from '#lib/components/FileDrop.svelte';
	import PageContent from '#lib/components/PageContent.svelte';
	import ToolPlayer from '#lib/components/ToolPlayer.svelte';
	import {
		EditorSession,
		deliverSaveResult
	} from '#lib/components/editor/editor-session.svelte.js';
	import SpeedControls from '#lib/components/editor/tools/SpeedControls.svelte';
	import { PlayerState } from '#lib/player-state.svelte.js';
	import PageMeta from '#lib/seo.svelte';
	import { createLocalMediaSource, type LocalMediaSource } from '#lib/store.svelte.js';
	import { isMediaDrag, isMediaType } from '#lib/util/common.js';
	import Icon from '@iconify/svelte';
	import fileIcon from '@iconify-icons/mdi/file-music-outline';
	import saveIcon from '@iconify-icons/mdi/content-save';
	import closeIcon from '@iconify-icons/mdi/close';
	import { onDestroy, tick, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';

	type OpenedMedia = {
		player: PlayerState;
		session: EditorSession;
	};

	let opened = $state.raw<OpenedMedia | null>(null);
	let dragging = $state(false);
	let saving = $derived(opened?.session.saving ?? false);
	let saveProgress = $derived(
		opened?.session.saveState.status === 'converting' ? opened.session.saveState.progress : null
	);

	$effect(() => {
		opened?.session.initialize();
	});

	$effect(() => {
		const current = opened;
		const adjustment = current?.session.speedAdjustment;
		if (adjustment) untrack(() => current?.player.setSpeedAdjustment(adjustment));
	});

	onDestroy(() => opened?.session.cancelSave());

	function canDiscard() {
		return !opened?.session.speedChanged || confirm('Discard your unsaved changes?');
	}

	async function open(source: LocalMediaSource) {
		if (saving || !canDiscard()) return;

		const player = new PlayerState(source);
		opened = { player, session: new EditorSession(player) };
		// The player needs its canvas before the first frame is drawn
		await tick();
		try {
			await player.open(source);
		} catch (error) {
			if (opened?.player !== player) return;
			const message = error instanceof Error ? error.message : String(error);
			toast.error(`Could not open ${source.file.name}: ${message}`);
			opened = null;
		}
	}

	function close() {
		if (saving || !canDiscard()) return;
		opened = null;
	}

	async function save() {
		const current = opened;
		if (!current) return;

		const result = await current.session.save();
		if (opened !== current) {
			if (result?.kind === 'download') await result.dispose().catch(() => {});
			return;
		}
		deliverSaveResult(current.session, result);
		if (current.session.saveState.status === 'complete')
			current.session.saveState = { status: 'idle' };
	}

	function handleDrag(event: DragEvent) {
		if (saving || !isMediaDrag(event.dataTransfer)) return;

		event.preventDefault();
		dragging = true;
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
	}

	function handleDrop(event: DragEvent) {
		dragging = false;
		if (saving || !isMediaDrag(event.dataTransfer)) return;

		event.preventDefault();

		const file = [...(event.dataTransfer?.files ?? [])].find((file) => isMediaType(file.type));
		if (file) open(createLocalMediaSource(file));
	}
</script>

<svelte:window
	ondragenter={handleDrag}
	ondragover={handleDrag}
	ondragleave={(event) => {
		if (event.relatedTarget === null) dragging = false;
	}}
	ondrop={handleDrop}
	ondragend={() => (dragging = false)}
	onblur={() => (dragging = false)}
	onbeforeunload={(event) => {
		if (saving || opened?.session.speedChanged) event.preventDefault();
	}}
/>

<svelte:head>
	<title>Speed & Pitch Changer - catcut</title>
	<PageMeta
		path="/tools/speed"
		description="Change the speed and pitch of your audio and video files, all in your browser. No ads, no uploads, no limits."
	/>
</svelte:head>

<PageContent>
	<section class="my-8 text-center">
		<h1 class="text-2xl font-bold text-white">Speed & pitch changer</h1>
		<p class="mt-2 text-neutral-300">
			Change the playback speed and pitch of video and audio files.
		</p>
	</section>

	{#if opened}
		{@const { player, session } = opened}
		<div
			class="mb-4 flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-3"
		>
			<Icon icon={fileIcon} class="size-8 shrink-0 text-violet-400" aria-hidden="true" />
			<span
				class="min-w-0 flex-1 truncate text-sm font-medium text-neutral-100"
				title={player.filename}
			>
				{player.filename}
			</span>
			<button
				type="button"
				aria-label="Close file"
				class="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
				disabled={saving}
				onclick={close}
			>
				<Icon icon={closeIcon} class="size-5" aria-hidden="true" />
			</button>
		</div>

		{#key player}
			<ToolPlayer {player} onclose={close} disabled={saving} highlighted={dragging} />
		{/key}

		{#if session.ready}
			<div class="mt-1">
				<SpeedControls {session} stacked />
			</div>

			<div class="mt-6 flex flex-wrap justify-end gap-2">
				{#if saving}
					<button
						type="button"
						class="cursor-pointer rounded-lg border border-white/10 px-4 py-2 text-sm font-medium hover:bg-white/10"
						onclick={() => session.cancelSave()}>Cancel</button
					>
				{/if}
				<button
					type="button"
					class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white bg-white px-4 py-2 text-sm font-medium text-neutral-900 tabular-nums hover:border-neutral-200 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={saving || !session.hasChanges}
					onclick={save}
				>
					{#if saveProgress !== null}
						Saving… {Math.floor(saveProgress * 100)}%
					{:else}
						<Icon icon={saveIcon} class="size-4" aria-hidden="true" />
						Save
					{/if}
				</button>
			</div>
		{/if}
	{:else}
		<div class="flex flex-col items-center">
			<FileDrop
				{dragging}
				multiple={false}
				hint="supports most video & audio files"
				onselect={([source]) => {
					if (source) open(source);
				}}
			/>
		</div>
	{/if}
</PageContent>
