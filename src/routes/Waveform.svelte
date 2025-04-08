<script lang="ts">
	import { RemoteFile } from '$lib/util';
	import { onMount } from 'svelte';
	import WaveSurfer from 'wavesurfer.js';

	export let audio: HTMLAudioElement;
	export let file: File | RemoteFile;
	let container: HTMLDivElement;
	let wavesurfer: WaveSurfer;

	onMount(() => {
		wavesurfer = WaveSurfer.create({
			container,
			waveColor: '#6d28d9',
			progressColor: '#6d28d9',
			cursorColor: 'transparent',
			media: audio,
			height: 96
		});

		wavesurfer.loadBlob(file instanceof RemoteFile ? file.blob! : file);

		return () => wavesurfer.destroy();
	});
</script>

<div class="h-full pointer-events-none relative z-0" bind:this={container} />
