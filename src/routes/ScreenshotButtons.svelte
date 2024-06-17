<script lang="ts">
	import PlayerButton from '$lib/components/PlayerButton.svelte';
	import { cameraCrop } from '$lib/icons';
	import cameraIcon from '@iconify-icons/mdi/camera';

	export let cropX: number;
	export let cropY: number;
	export let cropWidth: number;
	export let cropHeight: number;
	export let video: HTMLVideoElement;
	export let basename: string;
	export let willCrop: boolean;

	async function screenshot(useCrop = false) {
    const canvas = document.createElement('canvas');

		if (useCrop) {
			canvas.width = cropWidth;
			canvas.height = cropHeight;
			canvas.getContext('2d')!.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
		} else {
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
		}

		canvas.toBlob(async function(blob) {
			canvas.remove();
			if (!blob) return;
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `catcut-${useCrop ? 'cropped-' : ''}snap_${basename}.png`;
			a.click();

			setTimeout(() => {
				URL.revokeObjectURL(url);
				a.remove();
			}, 100);
		}, 'image/png');
	}
</script>

<div class="flex justify-center gap-2">
	<PlayerButton canBeSmall icon={cameraIcon} title="Screenshot frame" on:click={() => screenshot()} />
	{#if willCrop}
		<PlayerButton canBeSmall icon={cameraCrop} title="Screenshot frame with crop" on:click={() => screenshot(true)} />
	{/if}
</div>
