<script lang="ts">
	import FileDrop from '#lib/components/FileDrop.svelte';
	import PageContent from '#lib/components/PageContent.svelte';
	import MetadataFields from '#lib/components/editor/MetadataFields.svelte';
	import { MetadataChangeSet } from '#lib/components/editor/metadata-changeset.svelte.js';
	import { getMatchingOutputFormat } from '#lib/util/export.js';
	import { canOverwriteFiles, isAbort } from '#lib/util/common.js';
	import Icon, { type IconifyIcon } from '@iconify/svelte';
	import fileIcon from '@iconify-icons/mdi/file-music-outline';
	import overwriteIcon from '@iconify-icons/mdi/file-replace-outline';
	import downloadIcon from '@iconify-icons/mdi/download';
	import alertIcon from '@iconify-icons/mdi/alert-outline';
	import closeIcon from '@iconify-icons/mdi/close';
	import revertIcon from '@iconify-icons/mdi/undo';
	import {
		ALL_FORMATS,
		BlobSource,
		BufferTarget,
		Conversion,
		Input,
		MPEG_TS,
		Output,
		StreamTarget,
		type MetadataTags,
		type StreamTargetChunk
	} from 'mediabunny';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	type OpenedFile = {
		file: File;
		handle: FileSystemFileHandle | null;
		formatName: string;
		metadata: MetadataChangeSet;
	};

	const audioExtensions: `.${string}`[] = [
		'.mp3',
		'.m4a',
		'.aac',
		'.flac',
		'.ogg',
		'.oga',
		'.opus',
		'.wav',
		'.mka'
	];
	const videoExtensions: `.${string}`[] = ['.mp4', '.m4v', '.mov', '.webm', '.mkv', '.ogv'];

	let opened = $state.raw<OpenedFile | null>(null);
	let fileSystemAccess = $state<boolean | null>(null);
	let dragging = $state(false);
	let loading = $state(false);
	let saveProgress = $state<number | null>(null);
	let savingCopy = $state(false);
	let saving = $derived(saveProgress !== null);
	let openToken = 0;

	onMount(() => (fileSystemAccess = canOverwriteFiles()));

	function errorMessage(error: unknown) {
		return error instanceof Error ? error.message : String(error);
	}

	function isMediaType(type: string) {
		return type === '' || type.startsWith('audio/') || type.startsWith('video/');
	}

	async function readMetadata(file: File) {
		const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
		try {
			const format = await input.getFormat();
			if (format === MPEG_TS || !getMatchingOutputFormat(format))
				throw new Error(`Metadata can't be written to ${format.name} files.`);
			return { format, tags: await input.getMetadataTags() };
		} finally {
			input.dispose();
		}
	}

	async function writeMetadata({
		file,
		handle,
		tags,
		onProgress
	}: {
		file: File;
		handle: FileSystemFileHandle | null;
		tags: MetadataTags;
		onProgress?: (progress: number) => void;
	}): Promise<{ kind: 'overwritten' } | { kind: 'download'; file: File }> {
		const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
		let writer: WritableStreamDefaultWriter | null = null;
		let conversion: Conversion | null = null;
		try {
			const format = getMatchingOutputFormat(await input.getFormat());
			if (!format) throw new Error("This file's format can't be written.");

			let target: StreamTarget | BufferTarget;
			if (handle) {
				// Chromium writes to a swap file until close, so the original stays readable meanwhile
				const activeWriter = (writer = (await handle.createWritable()).getWriter());
				const stream = new WritableStream<StreamTargetChunk>(activeWriter);
				target = new StreamTarget(stream, { chunked: true, chunkSize: 1024 * 1024 });
			} else target = new BufferTarget();

			conversion = await Conversion.init({
				input,
				output: new Output({ format, target }),
				tags,
				tracks: 'all',
				copy: { mode: 'forced' },
				showWarnings: false
			});
			if (!conversion.isValid || conversion.discardedTracks.length > 0)
				throw new Error('This file could not be rewritten without losing a track.');
			if (onProgress) conversion.onProgress = (progress) => onProgress(progress);
			await conversion.execute();
			writer = null;

			if (handle) return { kind: 'overwritten' };
			if (!(target instanceof BufferTarget) || !target.buffer)
				throw new Error('The conversion did not produce a file.');
			return {
				kind: 'download',
				file: new File([target.buffer], file.name, { type: format.mimeType })
			};
		} catch (error) {
			await conversion?.cancel().catch(() => {});
			throw error;
		} finally {
			// Aborting discards the swap file and leaves the original untouched
			await writer?.abort().catch(() => {});
			input.dispose();
		}
	}

	async function open(file: File, handle: FileSystemFileHandle | null, discardChanges = false) {
		if (saving) return;
		if (
			!discardChanges &&
			opened?.metadata.hasChanges &&
			!confirm('Discard your unsaved metadata changes?')
		)
			return;
		const token = ++openToken;
		loading = true;
		try {
			const { format, tags } = await readMetadata(file);
			if (token !== openToken) return;
			opened = { file, handle, formatName: format.name, metadata: new MetadataChangeSet(tags) };
		} catch (error) {
			if (token === openToken) toast.error(`Could not open ${file.name}: ${errorMessage(error)}`);
		} finally {
			if (token === openToken) loading = false;
		}
	}

	async function pick() {
		try {
			const [handle] = await window.showOpenFilePicker({
				id: 'catcut-metadata',
				types: [
					{ description: 'Audio file', accept: { 'audio/*': audioExtensions } },
					{ description: 'Video file', accept: { 'video/*': videoExtensions } }
				]
			});
			if (handle) await open(await handle.getFile(), handle);
		} catch (error) {
			if (!isAbort(error)) toast.error(errorMessage(error));
		}
	}

	function isMediaDrag(dataTransfer: DataTransfer | null) {
		if (!dataTransfer?.types.includes('Files')) return false;

		const fileItems = [...dataTransfer.items].filter((item) => item.kind === 'file');
		return fileItems.length === 0 || fileItems.some((item) => isMediaType(item.type));
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

		const item = [...(event.dataTransfer?.items ?? [])].find(
			(item) => item.kind === 'file' && isMediaType(item.type)
		);
		const file = item?.getAsFile();
		if (!item || !file) return;
		const handle =
			fileSystemAccess && 'getAsFileSystemHandle' in item ? item.getAsFileSystemHandle() : null;
		openDropped(file, handle);
	}

	async function openDropped(file: File, pendingHandle: Promise<FileSystemHandle | null> | null) {
		const handle = await pendingHandle?.catch(() => null);
		await open(file, handle?.kind === 'file' ? (handle as FileSystemFileHandle) : null);
	}

	function download(file: File) {
		const url = URL.createObjectURL(file);
		const link = document.createElement('a');
		link.href = url;
		link.download = file.name;
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 5_000);
	}

	async function save(asCopy = false) {
		const current = opened;
		if (!current || saving || !current.metadata.hasChanges) return;
		const { handle } = current;
		let file = current.file;
		if (handle) {
			if (!asCopy && (await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
				toast.error('catcut needs permission to update this file.');
				return;
			}
			file = await handle.getFile().catch(() => current.file);
		}

		const tags = current.metadata.toMetadataTags();
		savingCopy = asCopy;
		saveProgress = 0;
		try {
			const result = await writeMetadata({
				file,
				handle: asCopy ? null : handle,
				tags,
				onProgress: (progress) => (saveProgress = progress)
			});
			saveProgress = null;
			if (result.kind === 'download') {
				download(result.file);
				toast.success(`Saved a copy of ${result.file.name} with the new metadata.`);
				if (opened === current && !handle) await open(result.file, null, true);
				return;
			}

			toast.success(`Updated ${file.name}.`);
			if (opened !== current || !handle) return;
			const updated = await handle.getFile().catch(() => null);
			if (updated) await open(updated, handle, true);
			else opened = { ...current, file, metadata: new MetadataChangeSet(tags) };
		} catch (error) {
			if (!isAbort(error)) toast.error(`Could not save metadata: ${errorMessage(error)}`);
		} finally {
			saveProgress = null;
		}
	}

	function close() {
		if (saving) return;
		if (opened?.metadata.hasChanges && !confirm('Discard your unsaved metadata changes?')) return;
		openToken++;
		loading = false;
		opened = null;
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
		if (saving || opened?.metadata.hasChanges) event.preventDefault();
	}}
/>

<svelte:head>
	<title>Metadata Editor - catcut</title>
	<link href="https://catcut.snaz.in/tools/metadata" rel="canonical" />
</svelte:head>

{#snippet saveButton({
	asCopy,
	label,
	icon,
	primary = false,
	compact = false
}: {
	asCopy: boolean;
	label: string;
	icon: IconifyIcon;
	primary?: boolean;
	/** Only show the icon on small viewports */
	compact?: boolean;
})}
	<button
		type="button"
		title={compact ? label : undefined}
		class={[
			'flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium tabular-nums disabled:cursor-not-allowed disabled:opacity-50',
			primary
				? 'border-white bg-white text-neutral-900 hover:border-neutral-200 hover:bg-neutral-200'
				: 'border-white/10 hover:bg-white/10',
			compact && 'max-sm:px-2.5'
		]}
		disabled={saving || !opened?.metadata.hasChanges}
		onclick={() => save(asCopy)}
	>
		{#if saveProgress !== null && savingCopy === asCopy}
			<span class={[compact && 'max-sm:sr-only']}>Saving…</span>
			{Math.floor(saveProgress * 100)}%
		{:else}
			<Icon {icon} class="size-4" aria-hidden="true" />
			<span class={[compact && 'max-sm:sr-only']}>{label}</span>
		{/if}
	</button>
{/snippet}

<PageContent>
	<section class="mb-4 mt-8 text-center">
		<h1 class="text-2xl font-bold text-white">Metadata editor</h1>
		<p class="mt-2 text-neutral-300">
			Edit tags and cover art without re-encoding. Your files never leave your device.
		</p>
	</section>

	{#if opened}
		{@const overwrites = opened.handle !== null}
		<div
			class="mb-4 flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-3"
		>
			<Icon icon={fileIcon} class="size-8 shrink-0 text-violet-400" aria-hidden="true" />
			<div class="flex min-w-0 flex-1 flex-col gap-1">
				<span class="truncate text-sm font-medium text-neutral-100" title={opened.file.name}>
					{opened.file.name}
				</span>
				<span class="text-xs text-neutral-400">{opened.formatName}</span>
			</div>
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
		<fieldset disabled={saving} class="contents">
			<MetadataFields metadata={opened.metadata} />
		</fieldset>

		<div class="mt-6 flex justify-end gap-2 flex-wrap">
			<button
				type="button"
				title="Revert"
				class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 max-sm:px-2.5"
				disabled={saving || !opened.metadata.hasChanges}
				onclick={() => opened?.metadata.reset()}
			>
				<Icon icon={revertIcon} class="size-4" aria-hidden="true" />
				<span class="max-sm:sr-only">Revert</span>
			</button>
			{#if overwrites}
				{@render saveButton({ asCopy: true, label: 'Save copy', icon: downloadIcon, compact: true })}
			{/if}
			{@render saveButton({
				asCopy: !overwrites,
				label: overwrites ? 'Update file' : 'Save copy',
				icon: overwrites ? overwriteIcon : downloadIcon,
				primary: true
			})}
		</div>
	{:else}
		<div class="flex flex-col items-center gap-4">
			<FileDrop
				{dragging}
				multiple={false}
				hint={loading ? 'reading metadata…' : 'supports most video & audio files'}
				pick={fileSystemAccess ? pick : undefined}
				onselect={([source]) => {
					if (source) open(source.file, null);
				}}
			/>
			{#if fileSystemAccess === false}
				<div
					class="flex w-full max-w-md gap-2 rounded-lg bg-amber-950/50 p-3 text-sm text-amber-200"
				>
					<Icon icon={alertIcon} class="size-6 shrink-0" aria-hidden="true" />
					<p>
						Your browser can't edit files in place, so saving will download an updated copy. Use a
						Chromium-based browser like Chrome or Edge to save over the original file.
					</p>
				</div>
			{/if}
		</div>
	{/if}
</PageContent>
