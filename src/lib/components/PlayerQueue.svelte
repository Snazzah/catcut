<script lang="ts">
	import playlistIcon from '@iconify-icons/mdi/playlist-play';
	import addIcon from '@iconify-icons/mdi/plus';
	import { queue, createLocalMediaSource, type QueueEntry } from '$lib/store.svelte';
	import { mobile } from '$lib/platform.svelte';
	import { DropdownMenu } from 'bits-ui';
	import PlayerButton from './common/PlayerButton.svelte';
	import ResponsiveMenu from './common/ResponsiveMenu.svelte';

	let fileInput: HTMLInputElement;

	function addFiles(event: Event) {
		if (!(event.currentTarget instanceof HTMLInputElement)) return;
		queue.add(...[...(event.currentTarget.files ?? [])].map(createLocalMediaSource));
		event.currentTarget.value = '';
	}
</script>

<input
	type="file"
	accept="audio/*,video/*"
	multiple
	hidden
	bind:this={fileInput}
	onchange={addFiles}
/>

{#snippet row(entry: QueueEntry, index: number, props: Record<string, unknown>)}
	{@const name = entry.source.origin === 'local' ? entry.source.file.name : entry.source.name}
	{@const active = entry.id === queue.activeEntry?.id}
	<button
		type="button"
		class={[
			'flex w-full items-center gap-3 rounded px-3 py-2.5 text-left focus-visible:bg-white/10 focus-visible:outline-none enabled:cursor-pointer enabled:hover:bg-white/10',
			mobile.current ? 'min-h-11 text-base' : 'text-sm',
			active ? 'bg-violet-400/10 text-violet-300' : 'text-neutral-100'
		]}
		aria-current={active ? 'true' : undefined}
		title={name}
		onclick={() => queue.select(entry.id)}
		{...props}
	>
		<span
			class="w-5 shrink-0 text-right tabular-nums {active ? 'text-violet-50' : 'text-neutral-400'}"
			>{index + 1}</span
		>
		<span class="min-w-0 flex-1 truncate">{name}</span>
	</button>
{/snippet}

{#snippet queueTitle()}
	Queue <span class="text-neutral-400">({queue.entries.length})</span>
{/snippet}

<ResponsiveMenu title={queueTitle}>
	{#snippet headerActions()}
		<PlayerButton title="Add to queue" icon={addIcon} onclick={() => fileInput.click()} />
	{/snippet}
	{#snippet trigger({ props })}
		<PlayerButton triggerProps={props} title="Queue" icon={playlistIcon} />
	{/snippet}

	{#if !mobile.current}
		<div class="flex items-center justify-between gap-3 px-3 py-2">
			<p class="text-sm font-semibold text-neutral-100">
				{@render queueTitle()}
			</p>
			<DropdownMenu.Item onSelect={() => fileInput.click()}>
				{#snippet child({ props })}
					<PlayerButton
						title="Add to queue"
						icon={addIcon}
						onclick={() => fileInput.click()}
						triggerProps={props}
					/>
				{/snippet}
			</DropdownMenu.Item>
		</div>
	{/if}
	{#each queue.entries as entry, index (entry.id)}
		{#if mobile.current}
			{@render row(entry, index, {})}
		{:else}
			<DropdownMenu.Item onSelect={() => queue.select(entry.id)}>
				{#snippet child({ props })}
					{@render row(entry, index, props)}
				{/snippet}
			</DropdownMenu.Item>
		{/if}
	{/each}
</ResponsiveMenu>
