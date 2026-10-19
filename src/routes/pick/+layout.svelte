<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<main class="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
	{@render children()}
</main>
