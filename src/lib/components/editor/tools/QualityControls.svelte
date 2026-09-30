<script lang="ts">
	import musicIcon from '@iconify-icons/mdi/music';
	import videoIcon from '@iconify-icons/mdi/video';
	import SelectField, { type SelectOption } from '$lib/components/SelectField.svelte';
	import { QUALITY_PRESETS, type AnyQuality } from '$lib/editing';
	import type { EditorSession } from '../editor-session.svelte';

	let { session }: { session: EditorSession } = $props();

	type QualitySelection = AnyQuality | 'original';

	const qualityOptions = [
		{ value: 'original', label: 'Original' },
		...QUALITY_PRESETS
	] satisfies readonly SelectOption<QualitySelection>[];
</script>

<div
	class="flex h-13 w-max min-w-full items-center justify-center gap-1.5 sm:justify-start sm:gap-3"
	role="tabpanel"
	aria-label="Quality settings"
>
	{#if session.player.hasVideo}
		<SelectField
			label="Video"
			icon={videoIcon}
			value={session.videoQuality ?? 'original'}
			options={qualityOptions}
			onchange={(quality) => session.updateVideoQuality(quality === 'original' ? null : quality)}
		/>
	{/if}

	{#if session.player.hasAudio}
		<SelectField
			label="Audio"
			icon={musicIcon}
			value={session.audioQuality ?? 'original'}
			options={qualityOptions}
			onchange={(quality) => session.updateAudioQuality(quality === 'original' ? null : quality)}
		/>
	{/if}
</div>
