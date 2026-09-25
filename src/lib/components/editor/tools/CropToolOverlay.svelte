<script lang="ts">
	import type { EditorSession } from '../editor-session.svelte';
	import CropOverlay from '../CropOverlay.svelte';

	let { session, active }: { session: EditorSession; active: boolean } = $props();
</script>

{#if session.crop && session.player.videoSize}
	<CropOverlay
		bounds={session.player.videoSize}
		crop={session.crop}
		handlesActive={active}
		oncropchange={(crop) => session.updateCrop(crop)}
	/>
{/if}
