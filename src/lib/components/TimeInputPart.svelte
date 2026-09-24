<script lang="ts">
	import downIcon from '@iconify-icons/mdi/menu-down';
	import upIcon from '@iconify-icons/mdi/menu-up';
	import Icon from '@iconify/svelte';

	let {
		value,
		label,
		seconds = false,
		noPad = false,
		min = 0,
		max,
		onchange,
		onpaste,
		onstep,
		atLowerBound,
		atUpperBound
	}: {
		value: number;
		label: string;
		seconds?: boolean;
		noPad?: boolean;
		min?: number;
		max?: number;
		onchange: (value: number) => void;
		onpaste: (text: string) => void;
		onstep: (value: number, delta: -1 | 1) => void;
		atLowerBound: boolean;
		atUpperBound: boolean;
	} = $props();

	let input: HTMLInputElement;
	let defaultMax = $derived(seconds ? 59.99 : 59);
	let resolvedMax = $derived(max ?? defaultMax);
	let inputValue = $derived(formatValue(value));

	function clamp(number: number) {
		return Math.max(min, Math.min(number, resolvedMax));
	}

	function truncate(number: number) {
		return seconds ? Math.floor(number * 100) / 100 : Math.trunc(number);
	}

	function formatValue(number: number) {
		const fixed = truncate(Math.abs(clamp(Number.isFinite(number) ? number : 0)));
		let result = seconds ? fixed.toFixed(2) : String(fixed);
		if (!noPad) result = result.padStart(seconds ? 5 : 2, '0');
		return result;
	}

	function setValue(number: number) {
		const next = truncate(clamp(Number.isFinite(number) ? number : 0));
		input.value = formatValue(next);
		onchange(next);
	}

	function step(delta: -1 | 1) {
		const current = Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : value;
		onstep(current, delta);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
		event.preventDefault();
		step(event.key === 'ArrowUp' ? 1 : -1);
	}

	function handlePaste(event: ClipboardEvent) {
		const text = event.clipboardData?.getData('text');
		if (!text) return;
		event.preventDefault();
		onpaste(text);
	}
</script>

<div class:seconds class="time-part relative">
	<input
		bind:this={input}
		type="number"
		{min}
		max={resolvedMax}
		value={inputValue}
		aria-label={label}
		class="h-7 appearance-none bg-transparent text-right text-sm text-neutral-100 tabular-nums transition-colors outline-none hover:bg-violet-500/10 focus:bg-violet-500/20"
		oninput={() => setValue(input.valueAsNumber)}
		onpaste={handlePaste}
		onkeydown={handleKeydown}
	/>
	<button
		type="button"
		tabindex="-1"
		class="stepper -top-2 rounded-t-sm"
		disabled={atUpperBound}
		aria-label={`Increase ${label}`}
		onclick={() => step(1)}
	>
		<Icon icon={upIcon} class="size-4" aria-hidden="true" />
	</button>
	<button
		type="button"
		tabindex="-1"
		class="stepper -bottom-2 rounded-b-sm"
		disabled={atLowerBound}
		aria-label={`Decrease ${label}`}
		onclick={() => step(-1)}
	>
		<Icon icon={downIcon} class="size-4" aria-hidden="true" />
	</button>
</div>

<style>
	.time-part input {
		width: 2ch;
	}

	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		appearance: none;
		margin: 0;
	}

	input[type='number'] {
		appearance: textfield;
	}

	.time-part.seconds input {
		width: 4.25ch;
	}

	.stepper {
		position: absolute;
		left: 0;
		display: flex;
		height: 0.5rem;
		width: 100%;
		pointer-events: none;
		align-items: center;
		justify-content: center;
		background: var(--color-violet-600);
		color: white;
		opacity: 0;
		transition: opacity 120ms ease;
	}

	.stepper:disabled {
		background: var(--color-violet-950);
		color: var(--color-neutral-400);
	}

	.time-part:hover .stepper,
	.time-part:focus-within .stepper {
		pointer-events: auto;
		opacity: 1;
	}
</style>
