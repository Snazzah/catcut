export function canOverwriteFiles() {
	return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

export function isAbort(error: unknown) {
	return error instanceof DOMException && error.name === 'AbortError';
}
