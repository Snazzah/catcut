/** @type {import('tailwindcss').Config}*/
const config = {
	content: ['./src/**/*.{html,js,svelte,ts}'],

	theme: {
		fontFamily: {
			mono: '"Source Code Pro Variable", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
		},

		extend: {
      backgroundImage: {
        'crop-line': "url('/images/cropline.gif')",
      }
		}
	}
};

module.exports = config;
