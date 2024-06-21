<script lang="ts">
	import type { Tags } from 'jsmediatags/types';
	import { createEventDispatcher } from 'svelte';

	export let tags: Tags | null;

	$: tagComment = !tags?.TXXX?.data?.user_description ? tags?.TXXX?.data?.data as string : undefined;
	let defaultTags: Record<string, string> = {
		title: tags?.title ?? '',
		author: tags?.artist ?? '',
		album: tags?.album ?? '',
		genre: tags?.genre ?? '',
		track: tags?.track ?? '',
		// jsmediatags uses TYER/TYE but some dont use that so we are just gonna use date as a year
		date: tags?.TDRC?.data as string ?? '',
		album_artist: tags?.TPE2?.data as string ?? tags?.TP2?.data as string ?? '',
		copyright: tags?.TCOP?.data as string ?? '',
		grouping: tags?.TIT1?.data as string ?? '',
		composer: tags?.TCOM?.data as string ?? '',

		// VLC: publisher
		TPUB: tags?.TPUB?.data as string ?? '',

		// Windows properties windows uses TXXX for comments with short_description = ""
		// VLC also uses this for track total making user_description = "TRACKTOTAL"
		comment: (tags?.comment as any as { text?: string })?.text ?? tagComment ?? ''
	};

	const tagNames: Record<string, string> = {
		title: 'Title',
		author: 'Artist',
		album: 'Album Name',
		genre: 'Genre',
		track: 'Track Number',
		date: 'Year',
		album_artist: 'Album Artist',
		copyright: 'Copyright',
		grouping: 'Grouping',
		composer: 'Composer',
		TPUB: 'Publisher',
		comment: 'Comments'
	};
	const numberTags = ['date', 'track'];
	let changedTags: string[] = [];

	const dispatch = createEventDispatcher();
	function onChange(tag: string) {
		// 'as any' the function cause of inconsistent types n such
		return ((e: Event & { target: EventTarget & HTMLInputElement }) => {
			const value = e.target.value;
			const changed = value !== defaultTags[tag];
			if (changed && !changedTags.includes(tag)) changedTags = [ ...changedTags, tag ];
			else if (!changed && changedTags.includes(tag)) changedTags = changedTags.filter((t) => t !== tag);
			dispatch('set', [tag, changed ? value : null]);
		}) as any;
	}
</script>

<div class="flex flex-col items-center gap-4 md:text-xl h-full">
	<div class="flex flex-col md:flex-row gap-2 flex-wrap w-full">
		{#each Object.keys(defaultTags) as tag}
			<div class="flex flex-col md:w-[calc(50%-8px)]">
				<label for={`metadata-${tag}`} class="flex-none w-full text-sm">
					{tagNames[tag]}
				</label>
				<input
					id={`metadata-${tag}`}
					type={numberTags.includes(tag) ? 'number' : 'text'}
					maxlength="255"
					placeholder="N/A"
					class="px-4 py-2 h-10 bg-neutral-900 rounded w-full outline-none border transition-all placeholder:opacity-35"
					class:border-transparent={!changedTags.includes(tag)}
					class:border-orange-400={changedTags.includes(tag)}
					value={defaultTags[tag]}
					on:input={onChange(tag)}
				/>
			</div>
		{/each}
	</div>
</div>
