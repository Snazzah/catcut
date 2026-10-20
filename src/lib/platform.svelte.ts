import { MediaQuery } from 'svelte/reactivity';

// NOTE fine pointer = precise mouse control, coarse = tapping usually
// "hover: hover" means if it supports hovering over things
export const narrowViewport = new MediaQuery('max-width: 639px', false);
const coarsePointer = new MediaQuery('pointer: coarse', false);
const finePointer = new MediaQuery('pointer: fine', false);
const hover = new MediaQuery('hover: hover', false);

/** Are we on mobile? */
export const mobile = {
	get current() {
		if (coarsePointer.current) return true;
		if (finePointer.current) return !hover.current;
		return narrowViewport.current;
	}
};

const standalone = new MediaQuery('display-mode: standalone', false);

/** Mainly for iOS webapps, whether to show the option to fullscreen */
export const naturallyFullscreen = {
	get current() {
		return mobile.current && standalone.current && (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad'));
	}
};

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
