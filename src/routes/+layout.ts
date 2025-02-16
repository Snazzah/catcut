import { browser } from "$app/environment";

export const prerender = true;
export const ssr = false;

export const load = () => {
	if (!browser) return;
	window.plausible =
		window.plausible ||
		((e, o, ev) => (window.plausible.q = window.plausible.q || []).push([e, o, ev]));
};
