<script lang="ts">
	import FileSelect from "./FileSelect.svelte";
	import VideoEditor from "./VideoEditor.svelte";
	import { RemoteFile } from "$lib/util";

	let inputFile: File | RemoteFile | undefined = undefined;
	let blobURL: string | undefined;
	$: blobURL = inputFile ? inputFile instanceof RemoteFile ? inputFile.url : URL.createObjectURL(inputFile) : undefined;
	$: console.log({ inputFile })

	function closeFile() {
		if (inputFile instanceof RemoteFile) inputFile.release();
		else if (blobURL) URL.revokeObjectURL(blobURL);
		inputFile = undefined;
	}
</script>

<!-- <svelte:head>
	<title>steam.exposed</title>
	<meta content="steam.exposed" property="og:title" />
	<meta content="https://steam.exposed/images/social.png" property="og:image" />
	<meta content="image/png" property="og:image:type" />
	<meta content="Breakdowns of Steam's Year in Reviews" property="og:description" />
	<meta content="https://steam.exposed" property="og:url" />
	<meta property="twitter:card" content="summary_large_image">
</svelte:head> -->

<main class={`flex flex-col items-center min-h-screen overflow-x-hidden ${!inputFile ? ' justify-center px-6 py-4 gap-4' : ''}`} class:justify-center={!inputFile}>
	<header class={`flex items-center justify-center ${inputFile ? 'px-6 py-4 w-full gap-2 bg-black' : 'flex-col'}`}>
		<!-- <a class="focus:outline focus:outline-2 focus:rounded font-bold bg-clip-text bg-gradient-to-b decoration-clone focus:outline-offset-4 focus:outline-red-200/50 from-red-400 text-transparent to-red-500" href="https://snazzah.com">
			Snazzah
		</a> -->
		<h1 class="text-3xl font-extrabold text-violet-500">
			catcut
		</h1>
		{#if !inputFile}
			<p>in-browser media editing</p>
		{/if}
	</header>

	{#if !inputFile}
		<FileSelect on:file={(e) => inputFile = e.detail} />
	{/if}

	{#if inputFile && blobURL}
		<VideoEditor file={inputFile} {blobURL} on:close={closeFile} />
	{/if}
</main>
