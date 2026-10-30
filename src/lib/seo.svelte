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

	export { pageMeta };
</script>

<!-- Canonical link and description tags, rendered inside a page's <svelte:head> -->
{#snippet pageMeta(path: string, pageDescription: string = description)}
	<link href="{origin}{path}" rel="canonical" />
	<meta name="description" content={pageDescription} />
	<meta property="og:description" content={pageDescription} />
{/snippet}
