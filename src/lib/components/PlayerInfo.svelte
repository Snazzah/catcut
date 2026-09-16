<script lang="ts">
	import informationOutlineIcon from '@iconify-icons/mdi/information-outline';
	import type { PlayerLoadState } from '$lib/player-state.svelte';
	import PlayerButton from './PlayerButton.svelte';
	import ResponsiveMenu from './ResponsiveMenu.svelte';

	let { loadState }: { loadState: PlayerLoadState } = $props();

	function formatSampleRate(sampleRate: number) {
		return sampleRate >= 1000 ? `${sampleRate / 1000} kHz` : `${sampleRate} Hz`;
	}

	function formatChannels(channels: number) {
		if (channels === 1) return '1 (mono)';
		if (channels === 2) return '2 (stereo)';
		return channels.toString();
	}
</script>

<ResponsiveMenu title="Media information">
	{#snippet trigger({ props })}
		<PlayerButton triggerProps={props} title="Media information" icon={informationOutlineIcon} />
	{/snippet}

	{#if loadState.status === 'loading'}
		<p class="m-0 px-3 py-4 text-sm text-neutral-300">Loading...</p>
	{:else}
		<div class="grid gap-5 p-3 text-sm">
			{#if loadState.metadata.video}
				<section aria-labelledby="video-information-heading">
					<h3 id="video-information-heading" class="mb-2 font-semibold text-neutral-100">Video</h3>
					<dl class="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5">
						<dt class="text-neutral-400">Codec</dt>
						<dd class="m-0 text-right text-neutral-100 uppercase">
							{loadState.metadata.video.codec}
						</dd>
						<dt class="text-neutral-400">Resolution</dt>
						<dd class="m-0 text-right text-neutral-100 tabular-nums">
							{loadState.metadata.video.width} × {loadState.metadata.video.height}
						</dd>
					</dl>
				</section>
			{/if}

			{#if loadState.metadata.audio}
				<section aria-labelledby="audio-information-heading">
					<h3 id="audio-information-heading" class="mb-2 font-semibold text-neutral-100">Audio</h3>
					<dl class="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5">
						<dt class="text-neutral-400">Codec</dt>
						<dd class="m-0 text-right text-neutral-100 uppercase">
							{loadState.metadata.audio.codec}
						</dd>
						<dt class="text-neutral-400">Sample rate</dt>
						<dd class="m-0 text-right text-neutral-100 tabular-nums">
							{formatSampleRate(loadState.metadata.audio.sampleRate)}
						</dd>
						<dt class="text-neutral-400">Channels</dt>
						<dd class="m-0 text-right text-neutral-100 tabular-nums">
							{formatChannels(loadState.metadata.audio.channels)}
						</dd>
					</dl>
				</section>
			{/if}
		</div>
	{/if}
</ResponsiveMenu>
