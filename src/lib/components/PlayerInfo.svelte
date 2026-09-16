<script lang="ts">
	import informationOutlineIcon from '@iconify-icons/mdi/information-outline';
	import type { PlayerState } from '$lib/player-state.svelte';
	import PlayerButton from './PlayerButton.svelte';
	import ResponsiveMenu from './ResponsiveMenu.svelte';
	import type { MetadataTags } from 'mediabunny';

	let { player }: { player: PlayerState } = $props();

	let fileInfo = $derived.by(() => {
		const input = player.input;
		if (!input) return null;

		return Promise.all([input.getFormat(), input.getMimeType(), input.source.getSizeOrNull()]).then(
			([format, mimeType, size]) => ({ format: format.name, mimeType, size })
		);
	});

	let trackInfo = $derived.by(() => {
		const input = player.input;
		if (!input) return null;

		return Promise.all([input.getPrimaryVideoTrack(), input.getPrimaryAudioTrack()]).then(
			async ([videoTrack, audioTrack]) => {
				const [video, audio] = await Promise.all([
					videoTrack
						? Promise.all([
								videoTrack.getCodec(),
								videoTrack.getDisplayWidth(),
								videoTrack.getDisplayHeight()
							]).then(([codec, width, height]) =>
								codec === null ? null : { codec, width, height }
							)
						: null,
					audioTrack
						? Promise.all([
								audioTrack.getCodec(),
								audioTrack.getSampleRate(),
								audioTrack.getNumberOfChannels()
							]).then(([codec, sampleRate, channels]) =>
								codec === null ? null : { codec, sampleRate, channels }
							)
						: null
				]);

				return { video, audio };
			}
		);
	});

	let metaTags = $derived.by(() => {
		if (player.loadState.status !== 'ready') return null;
		const tags = player.loadState.metadata.tags;
		if (Object.keys(tags).length === 0) return null;

		const knownTags = [
			['Title', 'title'],
			['Description', 'description'],
			['Artist', 'artist'],
			['Album', 'album'],
			['Album Artist', 'albumArtist'],
			['Track Number', 'trackNumber'],
			['Total Tracks', 'tracksTotal'],
			['Disc Number', 'discNumber'],
			['Total Discs', 'discsTotal'],
			['Genre', 'genre'],
			['Date', 'date'],
			['Comment', 'comment'],
		] as const satisfies (readonly [string, keyof MetadataTags][]);

		const shownTags = knownTags.filter(([, key]) => {
			const value = tags[key];
			return value !== null && value !== undefined;
		});
		return shownTags.length > 0 ? shownTags : null;
	});

	function formatFileSize(bytes: number) {
		const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
		let value = bytes;
		let unit = 0;
		while (value >= 1024 && unit < units.length - 1) {
			value /= 1024;
			unit += 1;
		}

		return `${value.toLocaleString(undefined, { maximumFractionDigits: unit === 0 ? 0 : 2 })} ${units[unit]}`;
	}

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

	{#if player.loadState.status === 'loading'}
		<p class="m-0 px-3 py-4 text-sm text-neutral-300">Loading...</p>
	{:else}
		<div class="grid gap-5 p-3 text-sm">
			{#if fileInfo}
				{#await fileInfo then info}
					<section aria-labelledby="file-information-heading">
						<h3 id="file-information-heading" class="mb-2 font-semibold text-neutral-100">File</h3>
						<dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-1.5">
							<dt class="text-neutral-400">Container</dt>
							<dd class="m-0 text-right text-neutral-100">{info.format}</dd>
							<dt class="text-neutral-400">MIME type</dt>
							<dd class="m-0 truncate text-right text-neutral-100" title={info.mimeType}>
								{info.mimeType}
							</dd>
							{#if info.size !== null}
								<dt class="text-neutral-400">Size</dt>
								<dd class="m-0 text-right text-neutral-100 tabular-nums">
									{formatFileSize(info.size)}
								</dd>
							{/if}
						</dl>
					</section>
					{/await}
			{/if}

			{#if trackInfo}
				{#await trackInfo then tracks}
					{#if tracks.video}
						<section aria-labelledby="video-information-heading">
							<h3 id="video-information-heading" class="mb-2 font-semibold text-neutral-100">
								Video
							</h3>
							<dl class="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5">
								<dt class="text-neutral-400">Codec</dt>
								<dd class="m-0 text-right text-neutral-100 uppercase">
									{tracks.video.codec}
								</dd>
								<dt class="text-neutral-400">Resolution</dt>
								<dd class="m-0 text-right text-neutral-100 tabular-nums">
									{tracks.video.width} × {tracks.video.height}
								</dd>
							</dl>
						</section>
					{/if}

					{#if tracks.audio}
						<section aria-labelledby="audio-information-heading">
							<h3 id="audio-information-heading" class="mb-2 font-semibold text-neutral-100">
								Audio
							</h3>
							<dl class="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5">
								<dt class="text-neutral-400">Codec</dt>
								<dd class="m-0 text-right text-neutral-100 uppercase">
									{tracks.audio.codec}
								</dd>
								<dt class="text-neutral-400">Sample rate</dt>
								<dd class="m-0 text-right text-neutral-100 tabular-nums">
									{formatSampleRate(tracks.audio.sampleRate)}
								</dd>
								<dt class="text-neutral-400">Channels</dt>
								<dd class="m-0 text-right text-neutral-100 tabular-nums">
									{formatChannels(tracks.audio.channels)}
								</dd>
							</dl>
						</section>
					{/if}
				{/await}
			{/if}

			{#if metaTags}
				<section aria-labelledby="metadata-heading">
					<h3 id="metadata-heading" class="mb-2 font-semibold text-neutral-100">Metadata Tags</h3>
					<dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-1.5">
						{#each metaTags as [label, key] (key)}
							<dt class="text-neutral-400">{label}</dt>
							<dd class="m-0 text-right text-neutral-100" title={String(player.loadState.metadata.tags[key])}>
								{#if Array.isArray(player.loadState.metadata.tags[key])}
									{player.loadState.metadata.tags[key].join(', ')}
								{:else}
									{player.loadState.metadata.tags[key]}
								{/if}
							</dd>
						{/each}
					</dl>
				</section>
			{/if}
		</div>
	{/if}
</ResponsiveMenu>
