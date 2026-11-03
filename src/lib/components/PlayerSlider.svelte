<script lang="ts">
	import { Slider } from 'bits-ui';

	type Props = {
		value: number;
		min: number;
		max: number;
		step: number | number[];
		label: string;
		disabled?: boolean;
		class?: string;
		white?: boolean;
		onValueChange: (value: number) => void;
		onValueCommit?: (value: number) => void;
		onInteractionStart?: () => void;
	};

	let {
		value,
		min,
		max,
		step,
		label,
		disabled = false,
		class: className = '',
		white,
		onValueChange,
		onValueCommit,
		onInteractionStart
	}: Props = $props();

	const SLIDER_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']);
	let interacting = false;

	function startInteraction() {
		if (interacting || disabled) return;
		interacting = true;
		onInteractionStart?.();
	}

	function handlePointerDown(event: PointerEvent) {
		if (event.button === 0) startInteraction();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (SLIDER_KEYS.has(event.key)) startInteraction();
	}

	function handleValueChange(nextValue: number) {
		if (interacting) onValueChange(nextValue);
	}

	function handleValueCommit(nextValue: number) {
		if (!interacting) return;
		onValueCommit?.(nextValue);
		interacting = false;
	}
</script>

<Slider.Root
	type="single"
	{min}
	{max}
	{step}
	{value}
	{disabled}
	onValueChange={handleValueChange}
	onValueCommit={handleValueCommit}
	onpointerdown={handlePointerDown}
	onkeydowncapture={handleKeydown}
	aria-label={label}
	class={[
		'relative flex h-5 w-full touch-none items-center select-none',
		disabled && 'opacity-40 grayscale',
		className
	]}
>
	<span
		class={[
			'relative h-1 w-full grow overflow-hidden bg-neutral-300/25',
			disabled ? 'cursor-not-allowed' : 'cursor-pointer'
		]}
	>
		<Slider.Range class="{white ? 'bg-white' : 'bg-accent'} absolute h-full" />
	</span>
	<Slider.Thumb
		index={0}
		aria-label={label}
		class={[
			white ? 'bg-white' : 'bg-accent',
			'block size-4 rounded-full shadow-sm transition-transform focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:outline-none',
			disabled
				? 'cursor-not-allowed'
				: 'cursor-grab hover:scale-110 active:cursor-grabbing data-active:scale-110'
		]}
	/>
</Slider.Root>
