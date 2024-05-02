<script lang="ts">
	import ms from 'pretty-ms';
	import { MS_OPTIONS } from '$lib/util';

	export let trimEnd: number;
	export let trimStart: number;
</script>

<div class="flex flex-col md:flex-row md:justify-between items-center gap-4 md:text-xl h-full">
	<div class="flex flex-col md:flex-row items-center md:gap-4 gap-4">
		<div class="flex gap-4 items-center">
			<code class="rounded bg-neutral-900 px-4 py-2 text-neutral-200"
				>{ms(trimStart * 1000, MS_OPTIONS)}</code
			>
			<span>to</span>
			<code class="rounded bg-neutral-900 px-4 py-2 text-neutral-200"
				>{ms(trimEnd * 1000, MS_OPTIONS)}</code
			>
		</div>
		<code>({ms((trimEnd - trimStart) * 1000)})</code>
	</div>
</div>
