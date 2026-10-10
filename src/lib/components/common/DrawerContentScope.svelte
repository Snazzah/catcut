<script module lang="ts">
	import { getContext, setContext, type Snippet } from 'svelte';

	const drawerDepthKey = Symbol('responsive-drawer-depth');

	export function getDrawerDepth() {
		return getContext<number | undefined>(drawerDepthKey) ?? 0;
	}
</script>

<script lang="ts">
	let { children }: { children: Snippet } = $props();
	setContext(drawerDepthKey, getDrawerDepth() + 1);
</script>

{@render children()}
