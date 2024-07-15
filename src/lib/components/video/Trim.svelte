<script lang="ts">
	import ms from 'pretty-ms';
	import { createEventDispatcher } from 'svelte';
	import CheckBoxButton from '../CheckBoxButton.svelte';
	import TimeInput from '../TimeInput.svelte';

	export let trimEnd: number;
	export let trimStart: number;
	export let duration: number;
	export let currentTime: number;
	export let cantTrimReencode: boolean;
	export let trimReencoding: boolean;

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
	<div class="text-base">
		{#if !cantTrimReencode}
			<CheckBoxButton
				checked={trimReencoding}
				info="Re-encoding video takes a while to do but ensures the video is trimmed cleanly. Use this if short clips have delayed frames."
				on:click={() => dispatch('setreencoding', !trimReencoding)}
			>
				Re-encode video
			</CheckBoxButton>
		{/if}
	</div>
</div>
