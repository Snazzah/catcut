import type { Component } from 'svelte';
import type { IconifyIcon } from '@iconify/svelte';
import contentCutIcon from '@iconify-icons/mdi/content-cut';
import cropIcon from '@iconify-icons/mdi/crop';
import type { EditorSession } from './editor-session.svelte';
import CropToolOverlay from './tools/CropToolOverlay.svelte';
import CropControls from './tools/CropControls.svelte';
import TrimControls from './tools/TrimControls.svelte';

export const EDITOR_TOOL_IDS = ['trim', 'crop'] as const;
export type EditorToolId = (typeof EDITOR_TOOL_IDS)[number];
export type EditorToolMedia = 'any' | 'audio' | 'video';

type ToolComponent = Component<{ session: EditorSession }>;
type OverlayComponent = Component<{ session: EditorSession; active: boolean }>;

export type EditorToolDefinition = Readonly<{
	id: EditorToolId;
	label: string;
	icon: IconifyIcon;
	media: EditorToolMedia;
	controls: ToolComponent;
	overlay?: OverlayComponent;
	isChanged: (session: EditorSession) => boolean;
	reset: (session: EditorSession) => void;
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

export const editorTools = [
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
	}
] satisfies readonly EditorToolDefinition[];
