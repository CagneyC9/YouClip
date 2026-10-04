# YouClip

Create YouTube clips and share them with friends—no extension required to watch.

YouClip is a Chrome extension that adds a Clip button to YouTube. Choose a start and end time, add an optional title, and copy a shareable link.

The link opens on [youclip.stream](https://youclip.stream), where YouTube’s embedded player plays the selected section.

## Development status

YouClip is currently in development. The core clipping and sharing functionality works, and additional features are planned.

## Features

- Clip directly from YouTube’s video page.
- Choose start and end times using the timeline or time fields.
- Adjust timestamps to one decimal place.
- Add an optional clip title.
- Copy a link to share with friends.
- Watch shared clips without installing the extension.
- Open the original video from the clip viewer.

## How to use

1. Open a YouTube video.
2. Click the **Clip** button beside YouTube’s action buttons.
3. Choose your start and end times.
4. Add a title if you want.
5. Click **Share clip** to copy the link.
6. Send the link to a friend.

## Install for local testing

1. Download this repository and extract it, or clone it.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the folder containing `manifest.json`.
6. Open or refresh a YouTube video page.

After changing the extension files, reload the extension and refresh the YouTube page.

To preview the website locally, open its HTML pages with VS Code’s Live Server extension.

## How shared clips work

Each link contains the video ID, start time, end time, and optional title. The viewer reads these values and plays the selected section using YouTube’s embedded player.

YouClip does not download or re-upload videos. Shared clips depend on the original video remaining available and allowing embedded playback.

## Project files

| File or folder | Purpose |
|---|---|
| `manifest.json` | Chrome extension configuration |
| `content.js` | Clip button, clipping interface, and link generation |
| `style.css` | Extension interface styling |
| `watch/index.html` | Shared clip viewer |
| `feedback/index.html` | General feedback form |
| `uninstall/index.html` | Optional uninstall feedback form |
| `CNAME` | GitHub Pages custom domain configuration |
| `404.html` | Website fallback page |

## Planned improvements

- Saved clips accessible from the extension.
- Timeline zoom for precise clipping in longer videos.
- An extension settings menu.

## Feedback

Report a bug, suggest a feature, or share your thoughts:

- [Feedback form](https://youclip.stream/feedback/)
- Email: [youclipextension@gmail.com](mailto:youclipextension@gmail.com)

For bug reports, include your browser, what happened, and the steps to reproduce it.

## Credits

The scissors icon is from [Lucide](https://lucide.dev).
Its license notice should be included with distributed copies of YouClip.

---

YouClip is an independent project and is not affiliated with YouTube or Google.