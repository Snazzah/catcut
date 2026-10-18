<script>
	import MarkdownContent from '#lib/components/MarkdownContent.svelte';
	import Icon from '@iconify/svelte';
	import githubIcon from '@iconify-icons/mdi/github';
	import heartIcon from '@iconify-icons/mdi/heart';
</script>

<svelte:head>
<title>About - catcut</title>
<link href="https://catcut.snaz.in/about" rel="canonical" />
</svelte:head>

<MarkdownContent>

# Privacy Policy

catcut **does not send or store any of your media used in the app to a server**, all
processing is done in the browser.

Use of any third-party service (like Dropbox, Google Drive, etc.) will only be used to
retrieve the requested file by the user to be downloaded into webapp from the browser. When
authenticating with Google, an access token is retrieved and is used to download requested
files (via Google File Picker) from that service. Authorization data and access tokens are
stored in the browser (using local storage) and is never sent to any third-party server.
Authorization data and access tokens stored using catcut is secure and only accessible through
the catcut app. Security procedures are in place to protect the confidentiality of your data.

This site uses a self-hosted instance of [Plausible](https://plausible.io/privacy-focused-web-analytics)
for web analytics, which does not use cookies and is fully compliant with GDPR, CCPA and PECR.
All data is anonymous and used to gauge traffic, and does not send any information about your
media being used. Usage of analytics can be opted out of via [settings](/settings).

</MarkdownContent>
