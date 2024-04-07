// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import { SteamSummary, SteamProfileItems } from "$lib/server/api";

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		interface PageData {
      profile?: SteamSummary;
      profileItems?: SteamProfileItems | null;
      year?: string;
    }
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
