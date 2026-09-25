<script lang="ts">
	import type { EditorSession } from './editor-session.svelte';
	import { editorTools, isEditorToolAvailable } from './editor-tools';

	let { session }: { session: EditorSession } = $props();
	let overlayTools = $derived(
		editorTools.filter((tool) => tool.overlay && isEditorToolAvailable(tool, session))
	);
</script>

{#each overlayTools as tool (tool.id)}
	{#if tool.overlay}
		{@const Overlay = tool.overlay}
		<Overlay {session} active={session.activeTool === tool.id} />
	{/if}
{/each}
