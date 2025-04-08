<div align=center>
	<a href="https://catcut.snaz.in">
		<img src="/static/images/icon.png" height="128" alt="catcut">
	</a>
</div>

**catcut** is a webapp that allows you to quickly trim and edit videos in browser without uploading to a server, processed using [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm).


![](/static/images/screenshots/desktop-video.png)
![](/static//images/screenshots/desktop-audio.png)


## Contributing

Prerequisites for you: working knowledge of Svelte, Vite, and SvelteKit (which depends on knowing HTML, CSS, and JS).

Create a `.env` file with exactly this after cloning:

```
# https://www.dropbox.com/developers/chooser
PUBLIC_DROPBOX_CLIENT_ID=

# https://developers.google.com/drive/picker/guides/overview
PUBLIC_GOOGLE_KEY=
PUBLIC_GOOGLE_CLIENT_ID=

PUBLIC_PLAUSIBLE_HOSTNAME=
```

Afterwards, run `npm i` (or `pnpm i` if the former doesn't work).
To run the development server, run `npm run dev`.
