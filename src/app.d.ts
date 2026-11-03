declare global {
	namespace App {}

	interface LaunchParams {
		readonly files: readonly FileSystemHandle[];
		readonly targetURL: string | null;
	}

	interface LaunchQueue {
		setConsumer(consumer: (launchParams: LaunchParams) => unknown): void;
	}

	interface Window {
		readonly launchQueue?: LaunchQueue;
		gapi?: { load(libraries: string, callback: () => void): void };
		google?: GoogleNamespace;
		Dropbox?: { choose(options: DropboxChooserOptions): void };
	}

	interface GoogleTokenResponse {
		access_token: string;
		expires_in: number;
		error?: string;
	}

	interface GooglePickerDocument {
		id: string;
		name: string;
		mimeType: string;
		sizeBytes?: number;
	}

	interface GooglePickerBuilder {
		addView(view: unknown): GooglePickerBuilder;
		enableFeature(feature: string): GooglePickerBuilder;
		setOAuthToken(token: string): GooglePickerBuilder;
		setDeveloperKey(key: string): GooglePickerBuilder;
		setAppId(appId: string): GooglePickerBuilder;
		setCallback(
			callback: (data: { action: string; docs?: GooglePickerDocument[] }) => void
		): GooglePickerBuilder;
		build(): { setVisible(visible: boolean): void };
	}

	interface GoogleNamespace {
		accounts: {
			oauth2: {
				initTokenClient(config: {
					client_id: string;
					scope: string;
					callback: (response: GoogleTokenResponse) => void;
					error_callback?: (error: { type: string; message?: string }) => void;
				}): { requestAccessToken(options?: { prompt?: string }): void };
			};
		};
		picker: {
			DocsView: new (viewId?: string) => {
				setMimeTypes(mimeTypes: string): unknown;
				setIncludeFolders(include: boolean): unknown;
			};
			PickerBuilder: new () => GooglePickerBuilder;
			ViewId: { DOCS: string };
			Feature: { MULTISELECT_ENABLED: string };
			Action: { PICKED: string; CANCEL: string };
		};
	}

	interface DropboxChooserFile {
		name: string;
		link: string;
		bytes: number;
	}

	interface DropboxChooserOptions {
		success(files: DropboxChooserFile[]): void;
		cancel?(): void;
		linkType?: 'preview' | 'direct';
		multiselect?: boolean;
		extensions?: string[];
	}
}

export {};
