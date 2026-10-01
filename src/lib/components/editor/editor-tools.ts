import type { Component } from 'svelte';
import type { IconifyIcon } from '@iconify/svelte';
import contentCutIcon from '@iconify-icons/mdi/content-cut';
import cropIcon from '@iconify-icons/mdi/crop';
import resizeIcon from '@iconify-icons/mdi/aspect-ratio';
import tuneVariantIcon from '@iconify-icons/mdi/tune-variant';
import volumeHighIcon from '@iconify-icons/mdi/volume-high';
import type { EditorSession } from './editor-session.svelte';
import CropToolOverlay from './tools/CropToolOverlay.svelte';
import CropControls from './tools/CropControls.svelte';
import ResizeControls from './tools/ResizeControls.svelte';
import TrimControls from './tools/TrimControls.svelte';
import QualityControls from './tools/QualityControls.svelte';
import VolumeControls from './tools/VolumeControls.svelte';

export type EditorToolId = 'trim' | 'crop' | 'resize' | 'volume' | 'quality';

export type EditorToolDefinition = Readonly<{
	id: EditorToolId;
	label: string;
	icon: IconifyIcon;
	media: 'any' | 'audio' | 'video';
	controls: Component<{ session: EditorSession }>;
	overlay?: Component<{ session: EditorSession; active: boolean }>;
	isChanged: (session: EditorSession) => boolean;
	reset: (session: EditorSession) => void;
	layout?: 'expanded';
}>;

export function isEditorToolAvailable(tool: EditorToolDefinition, session: EditorSession) {
	if (!session.ready) return false;

	switch (tool.media) {
		case 'any':
			return session.player.hasAudio || session.player.hasVideo;
		case 'audio':
			return session.player.hasAudio;
		case 'video':
			return session.player.hasVideo;
		default: {
			const _exhaustive: never = tool.media;
			return _exhaustive;
		}
	}
}

export const editorTools: readonly EditorToolDefinition[] = [
	{
		id: 'trim',
		label: 'Trim',
		icon: contentCutIcon,
		media: 'any',
		controls: TrimControls,
		isChanged: (session) => session.trimChanged,
		reset: (session) => session.resetTrim()
	},
	{
		id: 'crop',
		label: 'Crop',
		icon: cropIcon,
		media: 'video',
		controls: CropControls,
		overlay: CropToolOverlay,
		isChanged: (session) => session.cropChanged,
		reset: (session) => session.resetCrop()
	},
	{
		id: 'resize',
		label: 'Resize',
		icon: resizeIcon,
		media: 'video',
		controls: ResizeControls,
		isChanged: (session) => session.resizeChanged,
		reset: (session) => session.resetResize()
	},
	{
		id: 'volume',
		label: 'Volume',
		icon: volumeHighIcon,
		media: 'audio',
		controls: VolumeControls,
		isChanged: (session) => session.audioChanged,
		reset: (session) => session.resetAudio()
	},
	{
		id: 'quality',
		label: 'Quality',
		icon: tuneVariantIcon,
		media: 'any',
		controls: QualityControls,
		isChanged: (session) => session.qualityChanged,
		reset: (session) => session.resetQuality()
	}
];
