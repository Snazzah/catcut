<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import prettyMilliseconds from 'pretty-ms';
	import { queue, type MediaSource } from '#lib/store.svelte.js';
	import { PlayerState } from '#lib/player-state.svelte.js';
	import { isDiscordActivity, activity } from '#lib/discord/index.svelte.js';
	import EditingShell from './editor/EditingShell.svelte';
	import EditorOverlayHost from './editor/EditorOverlayHost.svelte';
	import { EditorSession } from './editor/editor-session.svelte';
	import { editorTools } from './editor/editor-tools';
	import MediaHeader from './MediaHeader.svelte';
	import Player from './Player.svelte';
	import Icon from '@iconify/svelte';
	import uploadIcon from '@iconify-icons/mdi/file-upload-outline';
	import addFileIcon from '@iconify-icons/mdi/file-plus-outline';

	let {
		source,
		onclose,
		onloaderror,
		editing = $bindable(false),
		draggingMedia = false,
		addingToQueue = false
	}: {
		source: MediaSource;
		onclose: () => void;
		onloaderror: (message: string) => void;
		editing?: boolean;
		draggingMedia?: boolean;
		addingToQueue?: boolean;
	} = $props();
	const player = new PlayerState(untrack(() => source));
	player.onended = handleEnded;
	let autoplayNext = false;
	let editor = $state.raw(new EditorSession(player));
	let mounted = true;
	onDestroy(() => {
		mounted = false;
		editor.cancelSave();
	});
	let workspace: HTMLElement;
	let playerControlsVisible = $state(true);
	let editorLayout = $derived(editorTools.find((tool) => tool.id === editor.activeTool)?.layout);

	$effect(() => {
		const nextSource = source;
		untrack(async () => {
			const autoplay = autoplayNext ? true : undefined;
			autoplayNext = false;
			editor.cancelSave();
			editor = new EditorSession(player);
			try {
				await player.open(nextSource, { autoplay });
			} catch (error: unknown) {
				onloaderror(error instanceof Error ? error.message : String(error));
			}
		});
	});

	$effect(() => {
		editor.initialize();
	});

	function handleClose() {
		if (editing) {
			editing = false;
		} else onclose();
	}

	function handleEnded() {
		const next = queue.nextEntry;
		if (editing || editor.saving || !next) return;
		autoplayNext = true;
		queue.select(next.id);
	}

	async function save() {
		const session = editor;
		const result = await session.save();
		if (!mounted || session !== editor) {
			if (result?.kind === 'download') await result.dispose().catch(() => {});
			return;
		}
		if (!result) {
			if (editor.saveState.status === 'error') toast.error(editor.saveState.message);
			return;
		}
		if (result.kind === 'download') {
			const file = result.file;
			if (isDiscordActivity()) {
				// son...
				try {
					const data = new Uint8Array(await file.arrayBuffer());
					const url = `data:${file.type || 'application/octet-stream'};base64,${data.toBase64()}`;
					await activity.sdk!.commands.openExternalLink({ url });
				} finally {
					await result.dispose().catch(() => {});
				}
			} else {
				const url = URL.createObjectURL(file);
				const link = document.createElement('a');
				link.href = url;
				link.download = file.name;
				link.click();
				setTimeout(() => {
					URL.revokeObjectURL(url);
					result.dispose().catch(() => {});
				}, 5_000);
			}
		}

		toast.success(`Saved your file! This took ${prettyMilliseconds(result.durationMs)}.`);
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
	class:editor-expanded={editing && !editor.saving && editorLayout === 'expanded'}
	class:editor-mobile-expanded={editing && !editor.saving && editorLayout === 'mobile-expanded'}
	class:editor-saving={editing && editor.saving}
	style:grid-template-rows={editing ? 'minmax(0, 1fr) var(--editor-height)' : 'minmax(0, 1fr) 0rem'}
	bind:this={workspace}
>
	<MediaHeader
		{player}
		onclose={handleClose}
		closeLabel={editing ? 'Close editor' : 'Close media'}
		visible={editing || playerControlsVisible}
	/>

	{#if draggingMedia}
		<div
			class="pointer-events-none fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-6"
			role="status"
		>
			<div
				class="flex w-full max-w-96 flex-col items-center gap-1 rounded-xl border-2 border-dashed border-neutral-600 bg-neutral-900 p-6 text-center text-neutral-100 shadow-2xl"
			>
				<Icon
					icon={addingToQueue ? addFileIcon : uploadIcon}
					class="mb-2 size-8 text-violet-400"
					aria-hidden="true"
				/>
				<p class="text-lg font-bold text-white">
					{addingToQueue ? 'drop to add' : 'drop to replace'}
				</p>
				<p class="text-sm text-neutral-400">
					{addingToQueue
						? 'these files will be added into the queue.'
						: 'hold shift to add files to the queue.'}
				</p>
			</div>
		</div>
	{/if}

	<div
		class={[
			'min-h-0 overflow-hidden bg-black transition-[padding] duration-300 ease-out motion-reduce:transition-none',
			editing ? 'pt-[calc(3rem+var(--sait))]' : '',
			editing && player.hasVideo ? 'px-3 pb-3 sm:px-8 sm:pb-4' : ''
		]}
	>
		<Player
			{player}
			onclose={handleClose}
			onedit={openEditor}
			onfullscreen={toggleFullscreen}
			bind:controlsVisible={playerControlsVisible}
			showControls={!editing}
		>
			{#snippet overlay()}
				{#if editing && !editor.saving}
					<EditorOverlayHost session={editor} />
				{/if}
			{/snippet}
		</Player>
	</div>

	<div class="min-h-0 overflow-hidden">
		{#if editing}
			<EditingShell session={editor} onfullscreen={toggleFullscreen} onsave={() => void save()} />
		{/if}
	</div>
</section>

<style>
	#catcut-player {
		--editor-height: calc(12.5rem + var(--saib));
	}

	#catcut-player.editor-expanded {
		--editor-height: calc(15.5rem + var(--saib));
	}

	#catcut-player.editor-saving {
		--editor-height: calc(6rem + var(--saib));
	}

	@media (width < 640px) {
		#catcut-player.editor-mobile-expanded {
			--editor-height: calc(15.5rem + var(--saib));
		}
	}

	@media (min-width: 640px) {
		#catcut-player {
			--editor-height: 16rem;
		}

		#catcut-player.editor-expanded {
			--editor-height: 18.5rem;
		}

		#catcut-player.editor-saving {
			--editor-height: 6rem;
		}
	}
</style>
