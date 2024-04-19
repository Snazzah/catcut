import { get } from 'svelte/store';
import { googleDriveData } from './data';
import { PUBLIC_GOOGLE_CLIENT_ID, PUBLIC_GOOGLE_KEY } from '$env/static/public';

export const googleAllowed = !!PUBLIC_GOOGLE_CLIENT_ID && !!PUBLIC_GOOGLE_KEY;

export interface GoogleTokenResponse {
	access_token: string;
	expires_in: number;
	scope: string;
	token_type: string;
}

export async function fetchDriveFile(fileId: string): Promise<null | {
	name: string;
	mimeType: string;
	size: string;
}> {
	const auth = get(googleDriveData);
	if (!auth) return null;

	const response = await fetch(
		`https://content.googleapis.com/drive/v3/files/${fileId}?${new URLSearchParams({
			fields: 'name,mimeType,size'
		}).toString()}`,
		{
			headers: {
				Authorization: `${auth.token_type} ${auth.access_token}`
			}
		}
	);

	const body = await response.json();
	if (response.status !== 200) {
		console.error('Failed to fetch Google Drive file', response.status, body);
		return null;
	}

	return body;
}

export function toFileDownloadLink(fileId: string) {
	return `https://content.googleapis.com/drive/v3/files/${fileId}?${new URLSearchParams({
		alt: 'media'
	}).toString()}`;
}
