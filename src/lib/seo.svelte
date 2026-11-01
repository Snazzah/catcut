<script module lang="ts">
	const origin = 'https://catcut.snaz.in';

	export const description =
		'catcut lets you to easily view and edit video and audio files inside your browser. No ads, no uploads, no limits.';

	export function toDiscordComponent(component: unknown) {
		return (
			`<scr` +
			`ipt id="discord:component-embed" type="application/json">${JSON.stringify({ component }, null, 2)}</` +
			`script>`
		);
	}
</script>

<script lang="ts">
	let { path, description: pageDescription }: { path: string; description?: string } = $props();
</script>

<link href="{origin}{path}" rel="canonical" />
<meta name="description" content={pageDescription || description} />
<meta property="og:description" content={pageDescription || description} />

