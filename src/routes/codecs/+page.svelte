<script lang="ts">
	import { resolve } from '$app/paths';
	import { catcut } from '$lib/icons';
	import SmallTooltipContent from '$lib/components/SmallTooltipContent.svelte';
	import { registerAllCodecs } from '$lib/player-state.svelte';
	import arrowIcon from '@iconify-icons/mdi/arrow-left';
	import checkIcon from '@iconify-icons/mdi/check-circle';
	import closeIcon from '@iconify-icons/mdi/close-circle';
	import informationIcon from '@iconify-icons/mdi/information-outline';
	import loadingIcon from '@iconify-icons/mdi/loading';
	import Icon from '@iconify/svelte';
	import { Tooltip } from 'bits-ui';
	import { getDecodableCodecs, getEncodableCodecs, type MediaCodec } from 'mediabunny';
	import { onMount } from 'svelte';

	type PackageAttribution =
		| { package: string; decoderPackage?: never; encoderPackage?: never }
		| { package?: never; decoderPackage?: string; encoderPackage?: string };

	type CodecRow = PackageAttribution & {
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
				{ name: 'ProRes', codecs: ['prores'], decoderPackage: '@mediabunny/prores' }
			]
		},
		{
			title: 'Audio',
			rows: [
				{ name: 'AAC', codecs: ['aac'], encoderPackage: '@mediabunny/aac-encoder' },
				{ name: 'Opus', codecs: ['opus'] },
				{ name: 'MP3', codecs: ['mp3'], encoderPackage: '@mediabunny/mp3-encoder' },
				{ name: 'Vorbis', codecs: ['vorbis'] },
				{ name: 'FLAC', codecs: ['flac'], encoderPackage: '@mediabunny/flac-encoder' },
				{ name: 'AC-3', codecs: ['ac3'], package: '@mediabunny/ac3' },
				{ name: 'E-AC-3', codecs: ['eac3'], package: '@mediabunny/ac3' },
				{ name: 'DTS', codecs: ['dts'], package: '@mediabunny/dts' },
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

<main class="mx-auto min-h-svh w-full max-w-3xl p-4">
	<header>
		<a
			href={resolve('/')}
			class="flex items-center gap-2 text-xl font-black text-neutral-500 hover:text-neutral-300"
		>
			<Icon icon={arrowIcon} class="size-6" />
			<Icon icon={catcut} class="size-6" />
			<span class="text-accent">catcut</span>
		</a>
	</header>

	<section class="mt-6 mb-4">
		<h1 class="text-3xl font-bold text-white">Codec compatibility</h1>
		<p class="mt-2 text-sm text-neutral-400">
			Check your browser's supported codecs using <a
				href="https://mediabunny.dev/codec-registry/overview"
				target="_blank"
				class="text-accent hover:underline">Mediabunny's codec registry</a
			>
		</p>
	</section>

	{#each codecTables as table (table.title)}
		<section class="mt-8">
			<h2 class="mb-3 text-2xl font-bold text-white">{table.title}</h2>
			<div class="overflow-hidden rounded-xl border border-neutral-800">
				<table class="w-full border-collapse text-left">
					<thead class="bg-neutral-900 text-xs font-bold tracking-wide text-neutral-400 uppercase">
						<tr>
							<th class="px-4 py-3" scope="col">Format</th>
							<th class="w-32 px-4 py-3 text-center" scope="col">Decode</th>
							<th class="w-32 px-4 py-3 text-center" scope="col">Encode</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-neutral-800 bg-neutral-950">
						{#each table.rows as row (row.name)}
							<tr>
								<th class="px-4 py-3 font-medium text-neutral-200" scope="row">
									{row.name}
									{#if 'package' in row && row.package && (!supportsEvery(row.codecs, nativelyDecodableCodecs) || !supportsEvery(row.codecs, nativelyEncodableCodecs))}
										<span class="block text-xs font-medium text-neutral-400"
											>via {row.package}</span
										>
									{/if}
								</th>
								<td class="px-4 py-3">
									<div class="flex items-center justify-center">
										{#if loading}
											<Icon
												icon={loadingIcon}
												class="size-5 animate-spin text-neutral-500"
												aria-label="Checking"
											/>
										{:else if supportsEvery(row.codecs, decodableCodecs)}
											<span class="relative inline-flex">
												<Icon
													icon={checkIcon}
													class="size-5 text-emerald-400"
													aria-label="Supported"
												/>
												{#if 'decoderPackage' in row && row.decoderPackage && !supportsEvery(row.codecs, nativelyDecodableCodecs)}
													<span class="absolute top-1/2 left-full ml-1 -translate-y-1/2">
														<Tooltip.Root delayDuration={200} disableHoverableContent>
															<Tooltip.Trigger
																aria-label={`Decoder provided by ${row.decoderPackage}`}
															>
																{#snippet child({ props })}
																	<button
																		class="block text-neutral-500 hover:text-neutral-300"
																		{...props}
																	>
																		<Icon icon={informationIcon} class="size-3.5" />
																	</button>
																{/snippet}
															</Tooltip.Trigger>
															<SmallTooltipContent offset={8}
																>via {row.decoderPackage}</SmallTooltipContent
															>
														</Tooltip.Root>
													</span>
												{/if}
											</span>
										{:else}
											<Icon
												icon={closeIcon}
												class="size-5 text-neutral-600"
												aria-label="Not supported"
											/>
										{/if}
									</div>
								</td>
								<td class="px-4 py-3 text-center">
									{#if loading}
										<Icon
											icon={loadingIcon}
											class="mx-auto size-5 animate-spin text-neutral-500"
											aria-label="Checking"
										/>
									{:else if supportsEvery(row.codecs, encodableCodecs)}
										<span class="relative mx-auto inline-flex">
											<Icon
												icon={checkIcon}
												class="size-5 text-emerald-400"
												aria-label="Supported"
											/>
											{#if 'encoderPackage' in row && row.encoderPackage && !supportsEvery(row.codecs, nativelyEncodableCodecs)}
												<span class="absolute top-1/2 left-full ml-1 -translate-y-1/2">
													<Tooltip.Root delayDuration={200} disableHoverableContent>
														<Tooltip.Trigger
															aria-label={`Encoder provided by ${row.encoderPackage}`}
														>
															{#snippet child({ props })}
																<button
																	class="block text-neutral-500 hover:text-neutral-300"
																	{...props}
																>
																	<Icon icon={informationIcon} class="size-3.5" />
																</button>
															{/snippet}
														</Tooltip.Trigger>
														<SmallTooltipContent offset={8}
															>via {row.encoderPackage}</SmallTooltipContent
														>
													</Tooltip.Root>
												</span>
											{/if}
										</span>
									{:else}
										<Icon
											icon={closeIcon}
											class="mx-auto size-5 text-neutral-600"
											aria-label="Not supported"
										/>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/each}
</main>
