<script lang="ts">
	import SelectField, { type SelectOption } from '$lib/components/SelectField.svelte';
	import type { ResizeFit } from '$lib/editing';
	import type { EditorSession } from '../editor-session.svelte';

	let { session }: { session: EditorSession } = $props();
	let resize = $derived(session.resize);
	const fields = [
		{ id: 'width', label: 'W', name: 'Resize width' },
		{ id: 'height', label: 'H', name: 'Resize height' }
	] satisfies readonly { id: 'width' | 'height'; label: string; name: string }[];
	const fitOptions = [
		{ value: 'fill', label: 'Fill' },
		{ value: 'contain', label: 'Contain' },
		{ value: 'cover', label: 'Cover' }
	] satisfies readonly SelectOption<ResizeFit>[];

	function updateDimension(field: 'width' | 'height', event: Event) {
		if (!resize || !(event.currentTarget instanceof HTMLInputElement)) return;
		const input = event.currentTarget;
		const value = input.value === '' ? 0 : input.valueAsNumber;
		if (!Number.isFinite(value)) return;
		const dimension = Math.max(0, Math.min(20000, Math.round(value)));
		session.updateResize({ ...resize, [field]: dimension });
		input.value = dimension === 0 ? '' : String(dimension);
	}
</script>

{#if resize}
	<div
		class="flex h-full w-max min-w-full items-center gap-1.5 sm:gap-2"
		role="tabpanel"
		aria-label="Resize settings"
	>
		<div
			class="flex h-9 shrink-0 items-center overflow-hidden rounded-md bg-neutral-900 text-sm text-neutral-100 ring-1 ring-white/8 focus-within:ring-2 focus-within:ring-violet-300"
			role="group"
			aria-label="Resize dimensions"
		>
			{#each fields as field (field.id)}
				{#if field.id === 'height'}
					<span class="text-neutral-500" aria-hidden="true">×</span>
				{/if}
				<label class="flex h-full w-20 items-center sm:w-24">
					<span class="sr-only">{field.name}</span>
					<input
						type="number"
						class="min-w-0 flex-1 bg-transparent px-2 text-center font-medium tabular-nums outline-none placeholder:text-neutral-500"
						min="0"
						max="20000"
						step="1"
						placeholder="Auto"
						title="Pixels. Leave blank or enter 0 to preserve aspect ratio. Applied after cropping on export."
						value={resize[field.id] || ''}
						onchange={(event) => updateDimension(field.id, event)}
					/>
				</label>
			{/each}
		</div>
		<SelectField
			label="Fit"
			value={resize.fit}
			options={fitOptions}
			disabled={resize.width === 0 || resize.height === 0}
			onchange={(fit) => resize && session.updateResize({ ...resize, fit })}
		/>
		<button
			type="button"
			class="h-9 shrink-0 cursor-pointer rounded-md px-2 text-sm font-semibold text-neutral-200 outline-none hover:bg-white/8 hover:text-white focus-visible:ring-2 focus-visible:ring-violet-200 disabled:cursor-default disabled:text-neutral-600 disabled:hover:bg-transparent sm:px-3"
			disabled={!session.resizeChanged}
			onclick={() => session.resetResize()}>Reset</button
		>
	</div>
{/if}
