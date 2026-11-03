<script lang="ts">
	import PageContent from '#lib/components/PageContent.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<PageContent>
	<article
		class="prose prose-neutral prose-invert prose-a:text-violet-400 prose-a:hover:underline prose-a:no-underline prose-h1:text-2xl prose-h2:text-xl prose-p:mt-0 prose-headings:mb-2 prose-li:my-0 max-w-none"
	>
		{@render children?.()}
	</article>
</PageContent>
