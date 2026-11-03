<script lang="ts">
	import ResponsiveModal from '#lib/components/common/ResponsiveModal.svelte';
	import MetadataFields from './MetadataFields.svelte';
	import type { EditorSession } from './editor-session.svelte';

	let { open = $bindable(false), session }: { open?: boolean; session: EditorSession } = $props();
	let metadata = $derived(session.metadata);
</script>

<ResponsiveModal bind:open title="Edit metadata">
	{#snippet buttons()}
		<button
			type="button"
			class="cursor-pointer rounded-lg border border-white/10 px-4 py-2 text-sm font-medium hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
			disabled={!metadata?.hasChanges}
			onclick={() => metadata?.reset()}
		>
			Revert
		</button>
		<button
			type="button"
			class="cursor-pointer rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200"
			onclick={() => (open = false)}
		>
			Done
		</button>
	{/snippet}
	{#if metadata}
		<MetadataFields {metadata} />
	{/if}
</ResponsiveModal>
