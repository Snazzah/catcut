<script lang="ts">
	import playlistIcon from '@iconify-icons/mdi/playlist-play';
	import addIcon from '@iconify-icons/mdi/plus';
	import removeIcon from '@iconify-icons/mdi/trash-can';
	import editIcon from '@iconify-icons/mdi/pencil';
	import dragIcon from '@iconify-icons/mdi/drag-vertical';
	import Icon from '@iconify/svelte';
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import { queue, createLocalMediaSource, type QueueEntry } from '#lib/store.svelte.js';
	import { mobile } from '#lib/platform.svelte.js';
	import PlayerButton from './common/PlayerButton.svelte';
	import ResponsiveMenu from './common/ResponsiveMenu.svelte';

	let fileInput: HTMLInputElement;
	let editingQueue = $state(false);
	let editingEntries = $derived([...queue.entries]);

	function considerOrder(event: CustomEvent<DndEvent<QueueEntry>>) {
		editingEntries = event.detail.items;
	}

	function finalizeOrder(event: CustomEvent<DndEvent<QueueEntry>>) {
		editingEntries = event.detail.items;
		queue.reorder(editingEntries.map((entry) => entry.id));
	}

	function centerActiveEntry(element: HTMLElement) {
		const frame = requestAnimationFrame(() => {
			const active = element.querySelector<HTMLElement>('[aria-current="true"]');

			// Climb parents until theres a scrollable one
			let scroller = element.parentElement;
			while (scroller && !/auto|scroll/.test(getComputedStyle(scroller).overflowY))
				scroller = scroller.parentElement;
			if (!active || !scroller) return;

			// Center the thing
			const scrollerRect = scroller.getBoundingClientRect();
			const activeRect = active.getBoundingClientRect();
			scroller.scrollTop +=
				activeRect.top - scrollerRect.top - (scrollerRect.height - activeRect.height) / 2;
		});

		return () => cancelAnimationFrame(frame);
	}

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
	<svelte:element
		this={editingQueue ? 'div' : 'button'}
		type={editingQueue ? undefined : 'button'}
		role={editingQueue ? 'button' : undefined}
		tabindex="0"
		class={[
			'flex min-w-0 flex-1 items-center gap-3 rounded px-3 py-2.5 text-left hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none',
			editingQueue ? 'cursor-grab active:cursor-grabbing' : 'enabled:cursor-pointer',
			mobile.current ? 'min-h-11 text-base' : 'text-sm',
			active ? 'bg-violet-400/10 text-violet-300' : 'text-neutral-100'
		]}
		aria-current={active ? 'true' : undefined}
		title={name}
		onclick={() => queue.select(entry.id)}
		onkeydown={(event: KeyboardEvent) => {
			if (editingQueue && event.key === 'Enter') {
				event.preventDefault();
				event.stopPropagation();
				queue.select(entry.id);
			}
		}}
		{...props}
	>
		<span
			class="w-5 shrink-0 text-right tabular-nums {active ? 'text-violet-50' : 'text-neutral-400'}"
		>
			{#if editingQueue}
				<Icon icon={dragIcon} class="size-5" aria-hidden="true" />
			{:else}
				{index + 1}
			{/if}
		</span>
		<span class="min-w-0 flex-1 truncate">{name}</span>
	</svelte:element>
{/snippet}

{#snippet removeButton(entry: QueueEntry, props: Record<string, unknown>)}
	{@const name = entry.source.origin === 'local' ? entry.source.file.name : entry.source.name}
	<button
		type="button"
		class={[
			'flex shrink-0 cursor-pointer items-center justify-center rounded text-neutral-400 hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:outline-none',
			mobile.current ? 'size-11' : 'mr-1.5 size-9'
		]}
		title="Remove from queue"
		aria-label={`Remove ${name} from queue`}
		onclick={() => queue.remove(entry.id)}
		onmousedown={(event) => event.stopPropagation()}
		ontouchstart={(event) => event.stopPropagation()}
		{...props}
	>
		<Icon icon={removeIcon} class="size-5" aria-hidden="true" />
	</button>
{/snippet}

{#snippet queueTitle()}
	Queue <span class="text-neutral-400">({queue.entries.length})</span>
{/snippet}

{#snippet editButton(props: Record<string, unknown>)}
	<PlayerButton
		title="Edit queue"
		icon={editIcon}
		class={{ 'text-violet-300': editingQueue }}
		onclick={() => (editingQueue = !editingQueue)}
		triggerProps={{ ...props, 'aria-pressed': editingQueue }}
	/>
{/snippet}

<ResponsiveMenu
	popover={true}
	desktopHeader={true}
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

	<div {@attach centerActiveEntry}>
		{#if editingQueue}
			<div
				use:dndzone={{
					items: editingEntries,
					type: 'player-queue',
					dropFromOthersDisabled: true,
					dropTargetStyle: {},
					zoneTabIndex: -1,
					delayTouchStart: true
				}}
				aria-label="Queue"
				onconsider={considerOrder}
				onfinalize={finalizeOrder}
				data-vaul-no-drag
			>
				{#each editingEntries as entry, index (entry.id)}
					{@const name =
						entry.source.origin === 'local' ? entry.source.file.name : entry.source.name}
					<div class="flex items-center gap-1" aria-label={name}>
						{@render row(entry, index, {})}
						{@render removeButton(entry, {})}
					</div>
				{/each}
			</div>
		{:else}
			{#each queue.entries as entry, index (entry.id)}
				<div class="flex items-center gap-1">
					{@render row(entry, index, {})}
				</div>
			{/each}
		{/if}
	</div>
</ResponsiveMenu>
