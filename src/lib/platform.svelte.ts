import { MediaQuery } from 'svelte/reactivity';

export const mobile = new MediaQuery('max-width: 639px', false);

type SurfaceSubscriber = () => boolean;

class SurfaceTracker {
	#subscribers = new Set<SurfaceSubscriber>();
	#subscriberVersion = $state(0);

	subscribe(isOpen: SurfaceSubscriber) {
		this.#subscribers.add(isOpen);
		this.#subscriberVersion += 1;

		return () => {
			if (this.#subscribers.delete(isOpen)) this.#subscriberVersion += 1;
		};
	}

	get count() {
		void this.#subscriberVersion;
		let count = 0;
		for (const isOpen of this.#subscribers) {
			if (isOpen()) count += 1;
		}
		return count;
	}

	get open() {
		return this.count > 0;
	}
}

export const surfaces = new SurfaceTracker();
