export function canOverwriteFiles() {
	return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

export function isAbort(error: unknown) {
	return error instanceof DOMException && error.name === 'AbortError';
}

export function isMediaType(type: string) {
	return type === '' || type.startsWith('audio/') || type.startsWith('video/');
}

export function isMediaDrag(dataTransfer: DataTransfer | null) {
	if (!dataTransfer?.types.includes('Files')) return false;

	const fileItems = [...dataTransfer.items].filter((item) => item.kind === 'file');
	return fileItems.length === 0 || fileItems.some((item) => isMediaType(item.type));
}
