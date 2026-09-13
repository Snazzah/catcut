<script lang="ts">
	import type { IconifyIcon } from "@iconify/svelte";
	import Icon from "@iconify/svelte";
	import type { MouseEventHandler } from "svelte/elements";

	let { icon, onclick, title }: { icon: IconifyIcon, title?: string; onclick?: MouseEventHandler<HTMLButtonElement> } = $props();
</script>

<button class="hover:text-violet-300 cursor-pointer rounded-full" {title} {onclick}>
	<Icon icon={icon} class="size-6" />
</button>
