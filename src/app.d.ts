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
	}
}

export {};
