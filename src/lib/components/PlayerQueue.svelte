<script lang="ts">
	import playlistIcon from '@iconify-icons/mdi/playlist-play';
	import addIcon from '@iconify-icons/mdi/plus';
	import removeIcon from '@iconify-icons/mdi/trash-can';
	import editIcon from '@iconify-icons/mdi/pencil';
	import Icon from '@iconify/svelte';
	import { queue, createLocalMediaSource, type QueueEntry } from '$lib/store.svelte';
	import { mobile } from '$lib/platform.svelte';
	import { DropdownMenu } from 'bits-ui';
	import PlayerButton from './common/PlayerButton.svelte';
	import ResponsiveMenu from './common/ResponsiveMenu.svelte';

	let fileInput: HTMLInputElement;
	let editingQueue = $state(false);

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
			'flex min-w-0 flex-1 items-center gap-3 rounded px-3 py-2.5 text-left focus-visible:bg-white/10 focus-visible:outline-none enabled:cursor-pointer enabled:hover:bg-white/10',
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

{#snippet removeButton(entry: QueueEntry, props: Record<string, unknown>)}
	{@const name = entry.source.origin === 'local' ? entry.source.file.name : entry.source.name}
	<button
		type="button"
		class={[
			'flex shrink-0 cursor-pointer items-center justify-center rounded text-neutral-400 hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:outline-none',
			mobile.current ? 'size-11' : 'size-9 mr-1.5'
		]}
		title="Remove from queue"
		aria-label={`Remove ${name} from queue`}
		onclick={() => queue.remove(entry.id)}
		{...props}
	>
		<Icon icon={removeIcon} class="size-5" aria-hidden="true" />
	</button>
{/snippet}

{#snippet queueTitle()}
	Queue <span class="text-neutral-400">({queue.entries.length})</span>
{/snippet}

{#snippet editButton(props: Record<string, unknown>)}
	<span class={editingQueue ? 'text-violet-300' : undefined}>
		<PlayerButton
			title="Edit queue"
			icon={editIcon}
			onclick={() => (editingQueue = !editingQueue)}
			triggerProps={{ ...props, 'aria-pressed': editingQueue }}
		/>
	</span>
{/snippet}

<ResponsiveMenu
	title={queueTitle}
	onOpenChange={(open) => {
		if (!open) editingQueue = false;
	}}
>
	{#snippet headerActions()}
		<div class="flex items-center gap-3">
			{@render editButton({})}
			<PlayerButton title="Add to queue" icon={addIcon} onclick={() => fileInput.click()} />
		</div>
	{/snippet}
	{#snippet trigger({ props })}
		<PlayerButton triggerProps={props} title="Queue" icon={playlistIcon} />
	{/snippet}

	{#if !mobile.current}
		<div class="flex items-center justify-between gap-3 px-3 py-2">
			<p class="text-sm font-semibold text-neutral-100">
				{@render queueTitle()}
			</p>
			<div class="flex items-center gap-3">
				<DropdownMenu.Item onSelect={() => (editingQueue = !editingQueue)} closeOnSelect={false}>
					{#snippet child({ props })}
						{@render editButton(props)}
					{/snippet}
				</DropdownMenu.Item>
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
		</div>
	{/if}
	{#each queue.entries as entry, index (entry.id)}
		<div class="flex items-center gap-1">
			{#if mobile.current}
				{@render row(entry, index, {})}
				{#if editingQueue}{@render removeButton(entry, {})}{/if}
			{:else}
				<DropdownMenu.Item onSelect={() => queue.select(entry.id)}>
					{#snippet child({ props })}
						{@render row(entry, index, props)}
					{/snippet}
				</DropdownMenu.Item>
				{#if editingQueue}
					<DropdownMenu.Item onSelect={() => queue.remove(entry.id)} closeOnSelect={false}>
						{#snippet child({ props })}
							{@render removeButton(entry, props)}
						{/snippet}
					</DropdownMenu.Item>
				{/if}
			{/if}
		</div>
	{/each}
</ResponsiveMenu>
