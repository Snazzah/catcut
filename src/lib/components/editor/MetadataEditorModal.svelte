<script lang="ts">
	import ResponsiveModal from '$lib/components/common/ResponsiveModal.svelte';
	import CoverImageDropper from '../common/CoverImageDropper.svelte';
	import TextInput from '../common/TextInput.svelte';
	import NumberTotalInput from '../common/NumberTotalInput.svelte';
	import type { EditorSession } from './editor-session.svelte';
	import { metadataFields } from './metadata-changeset.svelte';

	let { open = $bindable(false), session }: { open?: boolean; session: EditorSession } = $props();
	let metadata = $derived(session.metadata);
	let image = $derived(metadata?.cover?.[0]);
	let src = $derived(image ? `data:${image.mimeType};base64,${image.data.toBase64()}` : null);

	async function selectCover(file: File) {
		const changes = metadata;
		if (!changes) return;
		const data = new Uint8Array(await file.arrayBuffer());
		if (metadata === changes) changes.cover = [{ data, mimeType: file.type, kind: 'coverFront' }];
	}
</script>

<ResponsiveModal bind:open title="Edit metadata">
	{#if metadata}
		<div class="flex flex-col items-center gap-4">
			<CoverImageDropper
				{src}
				changed={metadata.coverChanged}
				onselect={selectCover}
				ondelete={() => {
					if (metadata) metadata.cover = [];
				}}
				onrevert={metadata.original.images?.length
					? () => {
							if (metadata) metadata.cover = metadata.original.images;
						}
					: undefined}
			/>
		</div>
		<div class="mt-2 grid gap-2 md:grid-cols-2">
			{#each metadataFields as field (field.key)}
				{#if field.type === 'text'}
					<TextInput
						label={field.label}
						bind:value={
							() => metadata?.values[field.key] ?? '',
							(value) => {
								if (metadata) metadata.values[field.key] = value;
							}
						}
						changed={metadata.fieldChanged(field.key)}
						onrevert={() => metadata?.resetField(field.key)}
					/>
				{:else}
					<NumberTotalInput
						label={field.label}
						bind:value={metadata.values[field.key]}
						bind:total={metadata.values[field.total]}
						changed={metadata.fieldChanged(field.key)}
						totalChanged={metadata.fieldChanged(field.total)}
						onrevert={() => metadata?.resetField(field.key)}
						onreverttotal={() => metadata?.resetField(field.total)}
					/>
				{/if}
			{/each}
		</div>
	{/if}
</ResponsiveModal>
