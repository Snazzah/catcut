<script lang="ts">
	import Icon, { type IconifyIcon } from '@iconify/svelte';
	import addIcon from "@iconify-icons/mdi/plus";
	import { windowClose as closeIcon } from '$lib/icons';
	import { createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';

	export let tabs: {
		id: string;
		name: string;
		icon: IconifyIcon;
	}[];

	const dispatch = createEventDispatcher();
	const tabNew = {
		id: 'new',
		name: 'New',
		icon: addIcon
	};

	$: allTabs = [...tabs, tabNew];

	let currentTab = 'new';
	$: dispatch('showtab', currentTab);

	let openTabs: string[] = [];
	$: shownTabs = [...tabs.filter(({ id }) => openTabs.includes(id)).map(({ id }) => id), 'new'].map((id) => allTabs.find((t) => t.id === id)!);
</script>

<div class="flex flex-col">
	<div class="flex justify-between">
		<div class="flex gap-0.5 overflow-x-scroll md:overflow-x-hidden overflow-y-hidden grow items-end h-10">
			{#each shownTabs as tab (tab.id)}
				<button
					class="flex gap-2 justify-center items-center rounded-t-md px-4 py-2 transition-all"
					class:bg-neutral-800={currentTab === tab.id}
					class:text-white={currentTab === tab.id}
					class:bg-neutral-900={currentTab !== tab.id}
					style:padding-bottom={currentTab !== tab.id ? '4px' : ''}
					transition:fly={{ duration: 250, y: 32 }}
					on:click={() => {
						if (!openTabs.includes(tab.id) && tab.id !== 'new' || currentTab === tab.id) return;
						dispatch('hidetab', currentTab);
						currentTab = tab.id;
					}}
				>
					<Icon icon={tab.icon} />
					<span>{tab.name}</span>
					{#if tab.id !== 'new'}
						<button
							class="rounded-md transition-colors text-neutral-400 hover:bg-neutral-600 hover:text-white"
							on:click|stopPropagation={() => {
								dispatch('closetab', tab.id);

								// get the next tab being closed, or just go to new
								if (currentTab === tab.id) {
									const currentIndex = shownTabs.findIndex((t) => t.id === tab.id);
									const nextTab = (currentIndex < 0 ? undefined : shownTabs.filter((t) => t.id !== tab.id)[currentIndex]?.id) || 'new';
									currentTab = nextTab;
								}

								openTabs = openTabs.filter((id) => id !== tab.id);
							}}
						>
							<Icon icon={closeIcon} />
						</button>
					{/if}
				</button>
			{/each}
		</div>
		<button
			class="rounded-lg transition-all bg-violet-600 hover:bg-violet-700 text-white active:enabled:scale-95 px-4 my-0.5 ml-1 font-bold disabled:text-neutral-400 disabled:bg-neutral-700 disabled:opacity-50"
			disabled={openTabs.length === 0}
			on:click={() => {
				if (openTabs.length === 0) return;
				dispatch('save');
			}}
		>
			<span>Save</span>
		</button>
	</div>
	<div class="rounded-b-md rounded-tr-md bg-neutral-800 p-4 min-h-20 relative">
		{#if currentTab === 'new'}
			<div class="flex flex-wrap gap-2 items-center h-full">
				{#each tabs as tab}
					<button
						class={`rounded-lg transition-all text-white px-4 py-2 flex gap-2 justify-center items-center active:scale-95 ${openTabs.includes(tab.id) ? 'bg-neutral-600' : 'bg-violet-700 hover:bg-violet-600'}`}
						on:click={() => {
							if (!openTabs.includes(tab.id)) openTabs = [...openTabs, tab.id];
							dispatch('opentab', tab.id);
							currentTab = tab.id;
						}}
					>
						<Icon icon={tab.icon} class="w-6 h-6" />
						<span>{tab.name}</span>
					</button>
				{/each}
			</div>
		{:else}
			<slot tab={currentTab} />
		{/if}
	</div>
</div>
