import { OverlayScrollbars } from 'overlayscrollbars';
import 'overlayscrollbars/overlayscrollbars.css';
import type { Attachment } from 'svelte/attachments';

export const horizontalScrollbars: Attachment<HTMLElement> = (element) => {
	const instance = OverlayScrollbars(
		{ target: element, elements: { viewport: element } },
		{
			overflow: { x: 'scroll', y: 'hidden' },
			scrollbars: {
				theme: 'os-theme-light',
				autoHide: 'move',
				autoHideDelay: 500
			}
		}
	);

	return () => instance.destroy();
};

export const verticalScrollbars: Attachment<HTMLElement> = (element) => {
	const instance = OverlayScrollbars(
		{ target: element, elements: { viewport: element } },
		{
			overflow: { x: 'hidden', y: 'scroll' },
			scrollbars: {
				theme: 'os-theme-light',
				autoHide: 'scroll',
				autoHideDelay: 500
			}
		}
	);

	return () => instance.destroy();
};
