<script lang="ts">
	import { registerAllCodecs } from '#lib/player-state.svelte.js';
	import checkIcon from '@iconify-icons/mdi/check-circle';
	import closeIcon from '@iconify-icons/mdi/close-circle';
	import loadingIcon from '@iconify-icons/mdi/loading';
	import Icon from '@iconify/svelte';
	import { getDecodableCodecs, getEncodableCodecs, type MediaCodec } from 'mediabunny';
	import { onMount } from 'svelte';
	import PageContent from '#lib/components/PageContent.svelte';

	type CodecRow = {
		name: string;
		codecs: readonly MediaCodec[];
	};

	type CodecTable = {
		title: string;
		rows: readonly CodecRow[];
	};

	const codecTables = [
		{
			title: 'Video',
			rows: [
				{ name: 'AVC (H.264)', codecs: ['avc'] },
				{ name: 'HEVC (H.265)', codecs: ['hevc'] },
				{ name: 'VP8', codecs: ['vp8'] },
				{ name: 'VP9', codecs: ['vp9'] },
				{ name: 'AV1', codecs: ['av1'] },
				{ name: 'ProRes', codecs: ['prores'] }
			]
		},
		{
			title: 'Audio',
			rows: [
				{ name: 'AAC', codecs: ['aac'] },
				{ name: 'Opus', codecs: ['opus'] },
				{ name: 'MP3', codecs: ['mp3'] },
				{ name: 'Vorbis', codecs: ['vorbis'] },
				{ name: 'FLAC', codecs: ['flac'] },
				{ name: 'AC-3', codecs: ['ac3'] },
				{ name: 'E-AC-3', codecs: ['eac3'] },
				{ name: 'DTS', codecs: ['dts'] },
				{
					name: 'Linear PCM',
					codecs: [
						'pcm-s16',
						'pcm-s16be',
						'pcm-s24',
						'pcm-s24be',
						'pcm-s32',
						'pcm-s32be',
						'pcm-f32',
						'pcm-f32be',
						'pcm-f64',
						'pcm-f64be',
						'pcm-u8',
						'pcm-s8'
					]
				},
				{ name: 'μ-law PCM', codecs: ['ulaw'] },
				{ name: 'A-law PCM', codecs: ['alaw'] }
			]
		},
		{
			title: 'Subtitle',
			rows: [{ name: 'WebVTT', codecs: ['webvtt'] }]
		}
	] satisfies readonly CodecTable[];

	let loading = $state(true);
	let decodableCodecs = $state.raw(new Set<MediaCodec>());
	let encodableCodecs = $state.raw(new Set<MediaCodec>());
	let nativelyDecodableCodecs = $state.raw(new Set<MediaCodec>());
	let nativelyEncodableCodecs = $state.raw(new Set<MediaCodec>());

	function supportsEvery(codecs: readonly MediaCodec[], supportedCodecs: Set<MediaCodec>) {
		return codecs.every((codec) => supportedCodecs.has(codec));
	}

	onMount(async () => {
		const registration = await registerAllCodecs();
		const [decodable, encodable] = await Promise.all([getDecodableCodecs(), getEncodableCodecs()]);

		nativelyDecodableCodecs = new Set(registration.nativelyDecodable);
		nativelyEncodableCodecs = new Set(registration.nativelyEncodable);
		decodableCodecs = new Set(decodable);
		encodableCodecs = new Set(encodable);
		loading = false;
	});
</script>

<svelte:head>
	<title>Codec Compatibility - catcut</title>
	<link href="https://catcut.snaz.in/codecs" rel="canonical" />
</svelte:head>

<PageContent>
	<section class="mb-4">
		<h1 class="text-2xl font-bold text-white">Codec compatibility</h1>
		<p class="mt-2 text-neutral-300">
			Check your browser's supported codecs using <a
				href="https://mediabunny.dev/codec-registry/overview"
				target="_blank"
				class="text-violet-400 hover:underline">Mediabunny's codec registry</a
			>.
		</p>
	</section>

	<ul class="flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-300" aria-label="Support legend">
		<li class="flex items-center gap-1.5">
			<Icon icon={checkIcon} class="size-4 text-emerald-400" aria-hidden="true" />
			Native support
		</li>
		<li class="flex items-center gap-1.5">
			<Icon icon={checkIcon} class="size-4 text-amber-400" aria-hidden="true" />
			External support
		</li>
		<li class="flex items-center gap-1.5">
			<Icon icon={closeIcon} class="size-4 text-neutral-600" aria-hidden="true" />
			Not supported
		</li>
	</ul>

	{#each codecTables as table (table.title)}
		<section class="mt-5">
			<h2 class="mb-2 text-lg font-bold text-white">{table.title}</h2>
			<div class="overflow-hidden rounded-lg border border-neutral-800">
				<table class="w-full table-fixed border-collapse text-left text-sm">
					<thead class="bg-neutral-900 text-xs font-bold tracking-wide text-neutral-400 uppercase">
						<tr>
							<th class="w-1/2 px-3 py-2" scope="col">Format</th>
							<th class="w-1/4 px-2 py-2 text-center" scope="col">Decode</th>
							<th class="w-1/4 px-2 py-2 text-center" scope="col">Encode</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-neutral-800 bg-neutral-950">
						{#each table.rows as row (row.name)}
							<tr>
								<th class="px-3 py-2 font-medium text-neutral-200" scope="row">{row.name}</th>
								<td class="px-2 py-2 text-center">
									{@render supportIndicator(row.codecs, decodableCodecs, nativelyDecodableCodecs)}
								</td>
								<td class="px-2 py-2 text-center">
									{@render supportIndicator(row.codecs, encodableCodecs, nativelyEncodableCodecs)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/each}
</PageContent>

{#snippet supportIndicator(
	codecs: readonly MediaCodec[],
	supportedCodecs: Set<MediaCodec>,
	nativeCodecs: Set<MediaCodec>
)}
	{#if loading}
		<Icon
			icon={loadingIcon}
			class="mx-auto size-4 animate-spin text-neutral-500"
			aria-label="Checking"
		/>
	{:else if supportsEvery(codecs, supportedCodecs)}
		{@const native = supportsEvery(codecs, nativeCodecs)}
		<Icon
			icon={checkIcon}
			class={['mx-auto size-4', native ? 'text-emerald-400' : 'text-amber-400']}
			aria-label={native ? 'Native support' : 'External support'}
		/>
	{:else}
		<Icon icon={closeIcon} class="mx-auto size-4 text-neutral-600" aria-label="Not supported" />
	{/if}
{/snippet}
