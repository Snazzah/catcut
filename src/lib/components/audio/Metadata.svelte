<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Tags } from 'jsmediatags/types';
	import { createEventDispatcher } from 'svelte';
	import downloadIcon from '@iconify-icons/mdi/download';
	import clearIcon from '@iconify-icons/mdi/close';
	import revertIcon from '@iconify-icons/mdi/undo';

	export let tags: Tags | null;
	export let basename: string;

	$: tagComment = !tags?.TXXX?.data?.user_description ? tags?.TXXX?.data?.data as string : undefined;
	let defaultTags: Record<string, string> = {
		title: tags?.title ?? '',
		author: tags?.artist ?? '',
		album: tags?.album ?? '',
		cover: tags?.picture?.data ? 'applied' : '',
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
		comment: (tags?.comment as any as { text?: string })?.text ?? tagComment ?? '',

		// VLC: language
		language: tags?.TLAN?.data as string ?? ''
	};
	let cover = tags?.picture?.data ? 'applied' : '';

	const tagNames: Record<string, string> = {
		title: 'Title',
		author: 'Artist',
		album: 'Album Name',
		cover: 'Album Cover',
		genre: 'Genre',
		track: 'Track Number',
		date: 'Year',
		album_artist: 'Album Artist',
		copyright: 'Copyright',
		grouping: 'Grouping',
		composer: 'Composer',
		TPUB: 'Publisher',
		comment: 'Comments',
		language: 'Language'
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

	let fileInput: HTMLInputElement;
	let files: FileList | null = null;
	$: if (files && files[0]) {
		changedTags = [ ...changedTags, 'cover' ];
		cover = 'custom';
		dispatch('set', ['cover', files[0]]);
	}
	$: console.log(changedTags)

	function downloadCover() {
		if(tags?.picture?.data) {
			const a = document.createElement('a');
			a.href = `data:${tags.picture.format};charset=utf-8;base64,${btoa(String.fromCharCode.apply(null, tags.picture.data))}`;
			a.download = `catcut_cover_${basename}.${tags.picture.format.split('/')[1]}`;
			a.click();
			a.remove();
		}
	}
</script>

<div class="flex flex-col items-center gap-4 md:text-xl h-full">
	<div class="flex flex-col md:flex-row gap-2 flex-wrap w-full">
		{#each Object.keys(defaultTags) as tag}
			<div class="flex flex-col md:w-[calc(50%-8px)] relative">
				{#if tag === 'cover'}
					<span class="flex-none w-full text-sm">
						{tagNames[tag]}
					</span>
					<button
						class="px-4 py-2 h-10 flex justify-between items-center bg-neutral-900 rounded w-full outline-none border transition-all placeholder:opacity-35"
						class:border-transparent={!changedTags.includes(tag)}
						class:border-orange-400={changedTags.includes(tag)}
						on:click={function (e) {
							// @ts-ignore
							if (e.target === this) fileInput.click();
						}}
					>
						{#if !files}
							<input
								type="file"
								class="hidden"
								accept="image/png, image/jpeg"
								bind:files
								on:input={() => files = fileInput.files}
								bind:this={fileInput}
							/>
						{/if}

						{#if cover === 'applied'}
							<span class="italic">Cover applied</span>
						{:else if cover === ''}
							<span class="opacity-50">None</span>
						{:else}
							<span class="font-semibold italic">Image selected</span>
						{/if}
						<div class="flex gap-2 items-center">
							{#if cover !== defaultTags.cover && defaultTags.cover === 'applied'}
								<button
									class="transition-colors hover:text-white py-1"
									on:click={() => {
										changedTags = changedTags.filter((t) => t !== tag);
										files = null;
										cover = 'applied';
										dispatch('set', [tag, null]);
									}}
								>
									<Icon icon={revertIcon} class="w-6 h-6" />
								</button>
							{/if}
							{#if cover !== ''}
								<button
									class="transition-colors hover:text-white py-1"
									on:click={() => {
										const changed = defaultTags.cover !== '';
										if (changed) changedTags = [ ...changedTags, tag ];
										else changedTags = changedTags.filter((t) => t !== tag);
										files = null;
										cover = '';
										dispatch('set', [tag, changed ? '' : null]);
									}}
								>
									<Icon icon={clearIcon} class="w-6 h-6" />
								</button>
							{/if}
							{#if defaultTags.cover === 'applied' && cover === 'applied'}
								<button class="bg-neutral-700 text-white rounded px-2 py-1" on:click={downloadCover}>
									<Icon icon={downloadIcon} class="w-6 h-6" />
								</button>
							{/if}
						</div>
					</button>
				{:else}
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
						class:pr-12={numberTags.includes(tag) && changedTags.includes(tag)}
						value={defaultTags[tag]}
						on:input={onChange(tag)}
					/>
					{#if changedTags.includes(tag)}
						<button
							class="transition-colors hover:text-white py-1 px-2 h-10 absolute bottom-0 right-2"
							on:click={(e) => {
								// @ts-ignore
								e.target.previousElementSibling.value = defaultTags[tag];
								changedTags = changedTags.filter((t) => t !== tag);
								dispatch('set', [tag, null]);
							}}
						>
							<Icon icon={revertIcon} class="w-6 h-6 pointer-events-none" />
						</button>
					{/if}
				{/if}
			</div>
		{/each}
	</div>
</div>
