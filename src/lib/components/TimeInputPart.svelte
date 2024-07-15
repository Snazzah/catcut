<script lang="ts">
	import Icon from '@iconify/svelte';
	import upIcon from '@iconify-icons/mdi/menu-up';
	import downIcon from '@iconify-icons/mdi/menu-down';
	import { createEventDispatcher } from 'svelte';

	export let value = 0;
	export let seconds = false;
	export let noPad = false;
	export let min = 0;
	export let max: number | undefined = undefined;
	const defaultMax = seconds ? 59.99 : 59;
	const dispatch = createEventDispatcher();
	let input: HTMLInputElement;

	// aw this kinda sucks, doing this to not needlessly rerender values
	$: iValue = fixValue(value);
	$: iMin = fixPlaces(min);
	$: iMax = fixPlaces(max ?? defaultMax);

	// .toFixed rounds up, but i dont want that
	function fixPlaces(num: number) {
		return seconds ? (Math.floor(num * 100) / 100) : Math.trunc(num);
	}

	function fixNumber(num: number) {
		const maxNumber = fixPlaces(max ?? defaultMax);
		const minNumber = fixPlaces(min);
		const clampedNumber = Math.abs(Math.min(Math.max(num, minNumber), maxNumber));
		return fixPlaces(clampedNumber);
	}

	function fixValue(num: number) {
		let numberString = String(seconds ? fixNumber(num).toFixed(2) : fixNumber(num));
		if (!noPad) numberString = numberString.padStart(seconds ? 5 : 2, '0');
		return numberString.slice(0, seconds ? 5 : 2);
	}

	function setNumber(num: number) {
		const number = fixNumber(isNaN(num) ? 0 : num);
		input.value = fixValue(number);
		dispatch('set', number);
	}
</script>

<div class="relative number-input" class:seconds-input={seconds}>
	<input
		bind:this={input}
		value={iValue}
		min={iMin}
		max={iMax}
		type="number"
		on:input={() => setNumber(input.valueAsNumber)}
	/>
	<button
		class="-top-2 rounded-t"
		disabled={iMax === parseFloat(iValue)}
		on:click={() => setNumber(input.valueAsNumber + 1)}
	>
		<Icon icon={upIcon} class="w-5 h-5" />
	</button>
	<button
		class="-bottom-2 rounded-b"
		disabled={iMin === parseFloat(iValue)}
		on:click={() => setNumber(input.valueAsNumber - 1)}
	>
		<Icon icon={downIcon} class="w-5 h-5" />
	</button>
</div>

<style lang="scss">
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	input[type=number] {
		appearance: textfield;
	}

	.number-input {
		&:hover input {
			@apply bg-violet-600/10 text-white;
		}

		input {
			@apply w-6 bg-transparent h-7 text-right transition-colors;


			&:hover, &:focus {
				@apply outline-none bg-violet-600/25 text-white;
			}
		}

		&.seconds-input input {
			width: 60px;
		}

		button {
			@apply absolute w-full h-2 bg-violet-600 transition-all left-0 flex justify-center items-center text-white opacity-0 pointer-events-none;

			&:disabled {
				@apply bg-violet-950 text-neutral-400;
			}
		}

		&:hover button, & input:focus + button, & input:focus + button + button {
			@apply opacity-100 pointer-events-auto;
		}
	}
</style>
