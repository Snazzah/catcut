<script lang="ts">
	import ms from 'pretty-ms';
	import { createEventDispatcher } from 'svelte';
	import TimeInput from '../TimeInput.svelte';

	export let trimEnd: number;
	export let trimStart: number;
	export let duration: number;
	export let currentTime: number;

	const dispatch = createEventDispatcher();
</script>

<div class="flex flex-col md:flex-row md:justify-between items-center gap-4 md:text-xl h-full">
	<div class="flex flex-col md:flex-row items-center md:gap-4 gap-4">
		<div class="flex gap-4 items-center">
			<TimeInput
				value={trimStart}
				max={trimEnd}
				largestPossible={duration}
				on:set={(e) => dispatch('setstart', e.detail)}
				on:usecurrenttime={() => dispatch('setstart', currentTime)}
			/>
			<span>to</span>
			<TimeInput
				value={trimEnd}
				min={trimStart}
				max={duration}
				on:set={(e) => dispatch('setend', e.detail)}
				on:usecurrenttime={() => dispatch('setend', currentTime)}
			/>
		</div>
		<code>({ms((trimEnd - trimStart) * 1000)})</code>
	</div>
</div>
